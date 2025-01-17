"use strict";

module.exports = parsePathParams;

const _ = require("lodash");
const util = require("../../helpers/util");
const parseParameter = require("./parse-parameter");

/**
 * Parses OpenAPI path parameters in the HTTP request.
 * This middleware populates {@link Request#params} and {@link Request#pathParams}.
 *
 * NOTE: Express uses a special type of middleware for parsing path parameters.
 * This middleware must be registered using {@link Router#param} rather than {@link Router#use}, {@link Router#get}, etc.
 * In addition, path-parsing middleware must be registered for EACH path parameter in the OpenAPI definition.
 * See http://expressjs.com/4x/api.html#router.param for more info.
 *
 * @param   {MiddlewareContext}    context
 * @param   {express#Router}       [router]
 * @returns {function[]}
 */
function parsePathParams (context, router) {
  if (util.isExpressRouter(router)) {
    // This is special path-param middleware, which sets `req.params`
    registerPathParamMiddleware();

    // If the API changes, register any new path-params
    context.on("change", registerPathParamMiddleware);
  }
  else {
    util.debug(
      "WARNING! An Express Router/Application was not passed to the PathParamParser middleware. " +
      "req.params will not be parsed. Use req.pathParams instead."
    );
  }

  // This is normal middleware, which sets `req.pathParams`
  return [parseOpenApiPathParams];

  /**
   * Registers middleware to parse path parameters.
   */
  function registerPathParamMiddleware () {
    let pathParams = getAllPathParamNames();

    pathParams.forEach((param) => {
      if (!alreadyRegistered(param)) {
        router.param(param, pathParamMiddleware);
      }
    });
  }

  /**
   * Returns the unique names of all path params in the OpenAPI definition.
   *
   * @returns {string[]}
   */
  function getAllPathParamNames () {
    let params = [];

    function addParam (param) {
      if (param.in === "path") {
        params.push(param.name);
      }
    }

    if (context.api) {
      _.each(context.api.paths, (path) => {
        // Add each path parameter
        _.each(path.parameters, addParam);

        // Add each operation parameter
        _.each(path, (operation) => {
          _.each(operation.parameters, addParam);
        });
      });
    }

    return _.uniq(params);
  }

  /**
   * Determines whether we've already registered path-param middleware for the given parameter.
   *
   * @param   {string}    paramName
   * @returns {boolean}
   */
  function alreadyRegistered (paramName) {
    let params = router.params;
    if (!params && router._router) {
      params = router._router.params;
    }

    return params && params[paramName] &&
      (params[paramName].indexOf(pathParamMiddleware) >= 0);
  }

  /**
   * This is a special type of Express middleware that specifically parses path parameters and sets `req.params`.
   * See http://expressjs.com/4x/api.html#router.param
   */
  function pathParamMiddleware (req, res, next, value, name) {
    if (req.pathParams) {
      // Path parameters have already been parsed by
      req.params[name] = req.pathParams[name] || req.params[name];
    }

    next();
  }

  /**
   * Parses all OpenAPI path parameters and sets `req.pathParams`.
   * NOTE: This middleware cannot set `req.params`.  That requires special path-param middleware (see above)
   */
  function parseOpenApiPathParams (req, res, next) {
    if (util.isOpenApiRequest(req)) {
      req.pathParams = {};

      if (req.openapi.pathName.indexOf("{") >= 0) {
        // Convert the OpenAPI path to a RegExp
        let paramNames = [];
        let pathPattern = req.openapi.pathName.replace(util.openApiPathParamRegExp, (match, paramName) => {
          paramNames.push(paramName);
          return "([^\/]+)";
        });

        // Exec the RegExp to get the path param values from the URL
        let values = new RegExp(pathPattern + "\/?$", "i").exec(req.path);

        // Parse each path param
        for (let i = 1; i < values.length; i++) {
          let paramName = paramNames[i - 1];
          let paramValue = decodeURIComponent(values[i]);
          let param = _.find(req.openapi.params, { in: "path", name: paramName });

          util.debug('    Parsing the "%s" path parameter', paramName);
          req.pathParams[paramName] = parseParameter(param, paramValue, param);
        }
      }
    }

    next();
  }
}
