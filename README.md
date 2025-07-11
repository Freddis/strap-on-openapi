# Strap-on OpenAPI

Bring a fully fledged typechecked api to your app in just 5 minutes.

## Features
- Type checked through and through
- Completely customizable and open for extension
- Not opinionated. It solves only the problems it supposed to
- Easy to test
- 2 documentation generators included (Swagger, Stoplight)
- Typescript client generator included. 
- But since you got the OpenAPI you can generate clients for any language you want.

## What is Strap-On OpenAPI?

OpenApi is a standard for documenting your REST APIs. Something similar to JSDoc generators but with one major difference: it uses schemas that can be stricly typed and used for code generation.

This allows to quickly generate clients for your API for most languages, pretty neat right? The problem is those schemas are not very friendly to humans and it's very hard to fill them out by hand.

Documentation generators for OpenAPI allow you to send sample requests to your API and conveniently publish documentation for the consumers.

Now let's talk about Zod. Zod is a validation library that allows to infer types from validators. If an object passed validation with Zod, you can be sure that it contains certain fields even in compile time.

Zod works so well that I simply stopped using classes for models and DTOs in my own projects: i simply infer types from validators.

Now you're probably have the same idea as I had some time ago: why not combine Zod and OpenAPI and make our API absolutely typechecked both on the frontend and backend? That would be a blast! 

Strap-On OpenAPI is a lightweight non-opinionated framework that allows you do exactly that. It's highly customizable and easy to use while provides fully type-checked context. You can forget about those "any" that pop here and there in your APIs.

The framework doesn't have any predefined middlewares (I don't even use such concept) or excessive code. It has a few built-in errors and validators which I found helpful and even those are made with the same utilities that are available to you.

Simply put Strap-On OpenAPI is the glue that ties together OpenAPI, Zod and Openapi-TS. And you are in charge of how your API is going to be shaped and that's what differs this framework from tools like ```GraphqQL``` and ```tRPC```.


## Disclaimer
Configuration is a bit clunky due to huge amount of inferred types. But trust me, when you learn the basics (and there is no advanced level, it's really light weight) you would be able to configure your API in just 5 minutes.

Keep in mind that in a real project validators are defined in separate files and the production grade code is significantly more elegant than what you see here in the documentation.

Normally, a route definition supposed to look something like this:
``` typescript 
export const upsertWorkouts = openApi.factory.createRoute({
  method: OpenApiMethod.PUT,
  type: ApiRouteType.User,
  description: 'Updates or inserts workout for user',
  path: '/',
  validators: {
    body: workoutUpsertDtoValidator
    response: workoutUpserResponseValidator
  },
  handler: async (ctx) => {
    const result = await ctx.services.models.workout.upsert(ctx.viewer.id, ctx.params.body.items);
    return {items: result};
  },
});
```

## Installation

``` shell
npm install strap-on-openapi
```

## Quick start

The idea behind Strap-on OpenAPI design is that you don't need to bother yourself with configuration straight away. You just fire it up.

Right now I created a quickstart wrapper for Tanstack Start and Express.

### Express

``` typescript
//file: index.ts
const app = express();
const openapi = OpenApi.create();
openapi.wrappers.express.createSwaggerRoute('/swagger',app);
openapi.wrappers.express.createOpenApiRootRoute(app)
app.listen(3000);
```
And it's done. No need for any initial configuration, you already will have swagger documentation on http://localhost:3000/swagger

Ofcourse, since we haven't added routes, any attempt to send request to ```/api/something``` will result in one of built-in errors, but the API is surely works already.

### Tanstack Start
Due to a bit opinionated nature of Tanstack routing, we need more files: 

Root Route:
``` typescript
// file: src/routes/api.ts
// since we're using file routing it's important that it matches the base path which defaults to /api
import {createServerFileRoute} from '@tanstack/react-start/server';
import {openapi} from '../backend/utils/openApiInstance';

const methods = openapi.wrappers.tanstackStart.getOpenApiRootMethods();
export const ServerRoute = createServerFileRoute('/api').methods(methods);
```
Schema Route:

```typescript
// file: src/routes/schema.ts
import {createServerFileRoute} from '@tanstack/react-start/server';
import {openapi} from '../backend/utils/openApiInstance';

const methods = openapi.wrappers.tanstackStart.createShemaMethods();
export const ServerRoute = createServerFileRoute('/schema').methods(methods);
```

Swagger:
``` typescript
// file: src/routes/swagger.ts
import {createServerFileRoute} from '@tanstack/react-start/server';
import {openapi} from '../backend/utils/openApiInstance';

const methods = openapi.wrappers.tanstackStart.createSwaggerMethods('/schema');
export const ServerRoute = createServerFileRoute('/swagger').methods(methods);
```

Stoplight(Swagger Alternative):
```typescript
// file: src/routes/stoplight.ts
import {createServerFileRoute} from '@tanstack/react-start/server';
import {openapi} from '../backend/utils/openApiInstance';

const methods = openapi.wrappers.tanstackStart.createStoplightMethods('/schema');
export const ServerRoute = createServerFileRoute('/stoplight').methods(methods);
```

### Custom
You don't have to use a wrapper to strap OpenApi onto your framework. It's actually fairly simple to mount it on any framework: OpenAPI simply takes Request object and returns this object:
```typescript
{
  status: number,
  body: object
}
```
Here's the code for Express wrapper:
```typescript
public createOpenApiRootRoute(expressApp: ExpressApp): void {
    const route = this.service.getBasePath();
    // Handler simply creates a basic Request object from Express Request
    // and passes it to OpenAPI instance (this.service)
    const handler: ExpressHandler = async (req, res) => {
      const emptyHeaders: Record<string, string> = {};
      // Correcting the type for headers a little bit
      const headers = Object.entries(req.headers).reduce((acc, val) => ({
        ...acc,
        ...(typeof val[1] === 'string' ? {[val[0]]: val[1]} : {}),
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
      const result = await this.service.processRootRoute(route, openApiRequest);
      res.status(result.status).header('Content-Type', 'application/json').json(result.body);
    };
    // Assigning the same handler for every HTTP method matching our API base path
    const regex = new RegExp(`${route}.*`);
    expressApp.get(regex, handler);
    expressApp.post(regex, handler);
    expressApp.patch(regex, handler);
    expressApp.delete(regex, handler);
    expressApp.put(regex, handler);
  }
```
As you can see, it isn't a rocket science to strap it onto any framework.

## Adding Routes

Now we want to get deeper with Strapon OpenApi. Let's add some hot action.

We need to create a route and then add it to our OpenApi instance. I recommend to use a separate file for each route and then one more file for the route map:
``` typescript
// file: src/openapi/getCars.ts
export const getCars = openapi.factory.createRoute({
    type: OpenApiSampleRouteType.Public,
    method: OpenApiMethods.GET,
    path: "/get",
    description: "Returns list of cars in stock",
    validators: {
        query: z.object({
          make: z.string().optional().openapi({desicription: 'Car make filter'}),
        }),
        response: z.object({       
            name: z.string().openapi({description: 'Car name'}),
            make: z.string().openapi({description: 'Make'}),
            averageDriverIQ: z.number().openapi({description: 'Average driver\'s IQ according to studies'}),
            updatedAt: z.date().openapi({description: 'Last time the records was updated'}),
        }).array().openapi({description: 'List of cars'}),
    },
    handler: async (ctx) => {
        const m3 = {
            name: "M3",
            make: "BMW",
            averageDriverIQ: 80,
            updatedAt: new Date()
        }
         const supra = {
            name: "Supra",
            make: "Tayota",
            averageDriverIQ: 130,
            updatedAt: new Date()
        }
        const result = [m3,supra];
        const filterValue = ctx.params.query.make
        if(!filterValue){
          return result;
        }
        return result.filter(x => x.make === filterValue);
    }
})
openapi.addRoute('/cars',[getCars])
```
Now let's create a route map:
``` typescript
// file: src/openapi/routes.ts
import {OpenApiRouteMap,OpenApiSampleRouteType} from 'strap-on-openapi';
import {getCars} from './getCars';

export const openApiRoutes: OpenApiRouteMap<OpenApiSampleRouteType> = {
  '/cars': [
    getCars,
  ]
}
```
Finally we need to add our route map to the openapi instance
```typescript
// file: depends on your framework
openapi.addRouteMap(openApiRoutes);
```

Now the new route should appear on your Swagger or Stoplight documentation and you can send a request to test this it out.

```json
[
  {
    "name": "M3",
    "make": "BMW",
    "averageDriverIQ": 80,
    "updatedAt": "2025-06-25T22:32:37.698Z",
  }, 
  {
    "name": "Supra",
    "make": "Tayota",
    "averageDriverIQ": 130,
    "updatedAt": "2025-06-25T22:32:37.698Z",
  }
}]
```

The code sample above is a little bit overloaded with information. In a developed application routes look much prettier than that. Here's an example from a real project:

```typescript
export const upsertExercises = openApiInstance.factory.createRoute({
  method: OpenApiMethods.PUT,
  type: ApiRouteType.User,
  description: 'Updates or inserts exercise in users personal library',
  path: '/',
  validators: {
    body: z.object({
      items: exerciseUpsertDtoValidator.array(),
    }),
    response: z.object({
      items: exerciseValidator.array(),
    }),
  },
  handler: async (ctx) => {
    const result = await ctx.services.models.exercise.upsert(ctx.viewer.id, ctx.params.body.items);
    return {items: result};
  },
});
```
And you can always write your own wrapper function to make it even less verbal if you need to.

## Default Route Fields

- <b>Path</b> 

  Defines how route looks. You can have parameters in path using this syntax: ```/getCar/{id}```
- <b>Method:</b> 

  HTTP method (POST, GET, PUT, DELETE, PATCH). GET routes don't have body validators.
- <b>Description:</b> 

  The description of the route which will appear in the schema file and documentation. With default configuration documentaton check is forced and you will get a runtime error if it's empty (or small).

- <b>Type:</b> 

  Routes can be of a different type and those types are defined by you. If you don't provide route types then it defaults to ```OpenApiSampleRouteType``` which only has public routes. Route types can have different extra fields in route definition and different contexts (middlewares).

  Classic route types are public, user  which requires authorization and admin which has permissions on routes.
- <b>Validators:</b>

  Validators for input and output. It's the integral piece of each route since you will only get access to the data that has been validated and only able to return a valid data in your response. The types are inferred from the shapes of the validators.

- <b>Handler:</b>

  Basically a controller for your route. It takes the context which only contains body, path and request parameters and should return the response that fits the shape of the response validator.

  It's asbolutely intentional that you don't get there headers and cookies. By default you only get the minimal viable things you need in order to operate. You can always add extra information by creating different contexts for your route types.

## Configuraton

There are 2 ways of how you can configure Strap-on OpenAPI:
1. Inferred config (Recommended at the beggining)
2. Implement Config interface

### Interred configuration
```OpenApi``` comes with a builder which allows to configure openapi with a number of chained calls to various configuration methods.

Some calls are optional and some are required. If you're using a modern IDE such as VSCode you can simply follow Intellisense. Each configuraton call returns a new instance of builder with specific updated methods. ```create()``` method finalizes the build process and return an OpenApi instance.

Initially you have these options:

1. ```customizeErrors()```
Allows to configure different erorr types, their response shapes and allows to create the error handler that serves configured responses.
2. ```customizeRoutes()```
Allows to configure different route types and their settings: additional route fields, contexts, authentication methods.
3. ```defineGlobalConfig()``` Allows to configure general settings such as the base path where API handles the requests, servers where this API is avalble and other miscelaneous settings.
4. ```create()``` Creates an instance OpenApi.

These calls depend on each other and have to be called in the same order as they've written above. You can call any of these methods, but if you called ```customizeRoutes()``` you won't be able call ```customzieErrors()```.

This is done in such manner to allow Typescript compiler correctly pick up inferred types.

### Global Configuraton
```typescript
const api = OpenApi.builder.defineGlobalConfig({
  basePath: "/my-custom-api-path",
  apiName: 'My Cool API',
  servers: [
  {
      description: 'Local',
      url: 'http://localhost:3000/my-custom-api-path',
  },
  {
      description: 'Prod',
      url: 'https://mydomain.com/my-custom-api-path',
  }
  ],
  logLevel: OpenApiLogLevel.All,
  skipDescriptionsCheck: false
}).create()
```
If you do overrides here, don't forget to fill in servers. Documentation generators comes with playgrounds. These allow you to quickly test your API.

### Configuring Routes
Let's create custom route types for authenticated users
```typescript
  enum ApiRouteType {
    Public = 'Public',
    Member = 'Member',
  }

  export const api = OpenApi.builder.customizeRoutes(
    ApiRouteType
  ).defineRoutes({
      [ApiRouteType.Public]: {
          authorization: false,
      },
      [ApiRouteType.Member]: {
          authorization: true, // only affects schema
      }
  }).create()
```
After ```customizeRoutes()``` call we can define extra properties for our routes with Zod validators. Let's block access of the members to Premium areas.

```typescript
// Defining different subscription types for our members
enum Subscription {
    Free = 'Free',
    Premium = 'Premium',
}
export const api = OpenApi.builder.customizeRoutes(
  ApiRouteType
).defineRouteExtraParams({
    [ApiRouteType.Public]: undefined,
    [ApiRouteType.Member]: z.object({
        subscription: z.nativeEnum(Subscription)
    })
}).defineRoutes({
    [ApiRouteType.Public]: {
        authorization: false,
    },
    [ApiRouteType.Member]: {
        authorization: true,
    }
}).create();

// Now we can fill in subscription on member routes
const route = api.factory.createRoute({
    type: ApiRouteType.Member,
    method: OpenApiMethod.GET,
    path: "/premim-analytics",
    description: "Analytics for premium memebrs",
    validators: premiumAnalyticsValidator,
    handler: function (context) {
      // code that serves premium analytics to the member
    },
    subscription: Subscription.Permium //now we have this field here
})
```
At the moment this example is incomplete. Let's use our new field in the middleware that serves the context for member routes. It's called context factory and it receives one parameter that contains information about route, request objects and some other properties.

```typescript
export const api = OpenApi.builder.customizeRoutes(
    ApiRouteType
).defineRouteExtraParams({
    [ApiRouteType.Public]: undefined,
    [ApiRouteType.Member]: z.object({
        subscription: z.nativeEnum(Subscription)
    })
}).defineRouteContexts({
    [ApiRouteType.Public]: () => Promise.resolve({}),
    [ApiRouteType.Member]: async (ctx) => {
        // obtaining user
        const user: User | null = getUserFromRequest(ctx.request)
        if(!user){
          throw new UnauthorizedError();
        }
        if(ctx.route.subscription !== user.subscription){
            throw new SubscriptionMismatchError(user);
        }
        // this object will be accessible in each Member route
        return {user}
    }
}).defineRoutes({
    [ApiRouteType.Public]: {
        authorization: false,
    },
    [ApiRouteType.Member]: {
        authorization: true,
    }
}).create();

const route = api.factory.createRoute({
    type: ApiRouteType.Member,
    method: OpenApiMethod.GET,
    path: "/me",
    description: "Analytics for premium memebrs",
    validators: userValidator,
    handler: function (context) {
      // the context values are visibile in the routes
      return context.user
    },
    subscription: Subscription.Free
})

```
Note that route functions do depend on each other and have to be called in this order:
1. customizeRoutes()
2. defineRouteExtraParams()
3. defineRouteContexts()
4. defineRoutes()

### Configuring Errors


## Paths Math
Routing paths are defined as a string starting with ```/```. Paths can be ```/```', ```/something```,```/something/something``` and so on. Each route has a path and each RouteMap piece has a path. It's very convenient to nest paths on each other, it allows to moving routes arround using RouteMap quckly. 

'/' is considered to be an empty path. Empty paths collapse(ignored) when being add to each other.

```/ + / = /```

```/ + /something = /something```

You don't have to think twice when you decide on the shape of the routes. Just put '/' if you don't want this RoutePart to have any effect. 

>This is possible because it's a REST API and API routing is far more simplistic than website routing.


There are 3 kinds of RoutePath being used for every route:
1. Base path which defines the path where OpenApi sits relative to the domain name of the application. Usually it's something like ```/api``` or ```/api/v1```
2. Route group path which defines the path for a group of routes. Usually something like ```/cars``` or ```/users```. 
3. Route path which is the path of the route itself. It can be anything: an empty route '/', a parameter ```/${id}``` or an action ```/get```.

The final route is going to be the sum of all 3 pieces: base path + group path + route path. Something like ```/api/v1/users/${id}```

You don't have to utilize all 3 paths. It's up to you. It's absolutely possible to operate only with route paths by putting empty routes for other kinds of paths.