
import {format} from 'url';
import {ExpressHandler} from './types/ExpressHandler';
import {ExpressApp} from './types/ExpressApp';
import {DevelopmentUtils} from '../DevelopmentUtils/DevelopmentUtils';
import {OpenApi} from '../../OpenApi';
import {AnyConfig} from '../../types/config/AnyConfig';
import {RoutePath} from '../../types/RoutePath';

export class ExpressWrapper<
 TRouteTypes extends string,
 TErrorCodes extends string,
 TConfig extends AnyConfig<TRouteTypes, TErrorCodes>
> {
  protected service: OpenApi<TRouteTypes, TErrorCodes, TConfig>;
  protected developmentUtils: DevelopmentUtils;
  protected schemaRoute: RoutePath = '/openapi-schema';

  constructor(openApi: OpenApi<TRouteTypes, TErrorCodes, TConfig>) {
    this.service = openApi;
    this.developmentUtils = new DevelopmentUtils();
  }
  public createStoplightRoute(route: RoutePath, expressApp: ExpressApp): void {
    const handler: ExpressHandler = async (req, res) => {
      const body = this.developmentUtils.getStoplightHtml(this.schemaRoute);
      res.status(200).header('Content-Type', 'text/html').send(body);
    };
    this.createSchemaRoute(this.schemaRoute, expressApp);
    expressApp.get(route, handler);
  }

  public createSwaggerRoute(route: RoutePath, expressApp: ExpressApp): void {
    const handler: ExpressHandler = async (req, res) => {
      const body = this.developmentUtils.getSwaggerHTML(this.schemaRoute);
      res.status(200).header('Content-Type', 'text/html').send(body);
    };
    this.createSchemaRoute(this.schemaRoute, expressApp);
    expressApp.get(route, handler);
  }

  public createSchemaRoute(route: RoutePath, expressApp: ExpressApp): void {
    const handler: ExpressHandler = async (req, res) => {
      const body = this.service.schemaGenerator.getYaml();
      res.status(200).header('Content-Type', 'text/html').send(body);
    };
    expressApp.get(route, handler);
  }

  public createOpenApiRootRoute(expressApp: ExpressApp): void {
    const route = this.service.getBasePath();
    const headerToStr = (header: string | string[]) => {
      if (Array.isArray(header)) {
        return header.join(',');
      }
      return header;
    };
    const handler: ExpressHandler = async (req, res) => {
      const emptyHeaders: Record<string, string> = {};
      const headers = Object.entries(req.headers).reduce((acc, val) => ({
        ...acc,
        ...(typeof val[1] !== 'undefined' ? {[val[0]]: headerToStr(val[1])} : {}),
      }), emptyHeaders);
      const url = format({
        protocol: req.protocol,
        host: req.host,
        pathname: req.originalUrl,
      });
      const openApiRequest = new Request(url, {
        body: req.body,
        headers: headers,
        method: req.method,
      });
      const result = await this.service.processRootRoute(openApiRequest);
      res.status(result.status).header('Content-Type', 'application/json').json(result.body);
    };
    const regex = new RegExp(`${route}.*`);
    expressApp.get(regex, handler);
    expressApp.post(regex, handler);
    expressApp.patch(regex, handler);
    expressApp.delete(regex, handler);
    expressApp.put(regex, handler);
  }
}
