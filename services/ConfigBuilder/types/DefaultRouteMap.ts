import {SampleRouteType} from '../../../enums/SampleRouteType';
import {RouteConfigMap} from '../../../types/config/RouteConfigMap';
import {ErrorCode} from '../../../enums/ErrorCode';
import {DefaultRouteContextMap} from './DefaultRouteContextMap';
import {DefaultRouteParamsMap} from './DefaultRouteParamsMap';

export class DefaultRouteMap implements RouteConfigMap<SampleRouteType, ErrorCode, DefaultRouteParamsMap, DefaultRouteContextMap> {
  Public = {
    authorization: false,
    extraProps: new DefaultRouteParamsMap().Public,
    contextFactory: new DefaultRouteContextMap().Public,
  } as const;
}
