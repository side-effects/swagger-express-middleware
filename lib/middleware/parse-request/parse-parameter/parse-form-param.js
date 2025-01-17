"use strict";

module.exports = parseFormParam;

const parse = require("./parse");
const querystring = require("querystring");

/**
 * Parses the given form parameter value.
 *
 * @param {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {*}                 - The parsed value, or the default value
 */
function parseFormParam (parseInfo) {
  switch (parseInfo.schema.type) {
    case "array":
      return parseFormArray(parseInfo);

    case "object":
      return parseFormObject(parseInfo);

    default:
      return parse.primitive(parseInfo);
  }
}

/**
 * Parses an array using OpenAPI "form" style syntax.
 *
 * @see https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#style-examples
 *
 * @param {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {Array|undefined}   - The parsed value
 */
function parseFormArray (parseInfo) {
  let { param } = parseInfo;
  let value = parseInfo.valueOrDefault;
  let parsedValue = value;

  if (typeof value === "string") {
    if (param.explode) {
      if (param.in === "query") {
        // Exploded form params (e.g. "color=blue&color=green&color=red") are normally expanded
        // to arrays automatically by the querystring parser, but NOT for single-item arrays
        // (e.g. "color=blue").  So wrap the single value in an array.
        parsedValue = [value];
      }
      else {
        // Exploded cookie params are poorly defined in the OpenAPI Spec
        // (see https://github.com/OAI/OpenAPI-Specification/issues/1528).
        // The interpretation that we've decided to go with is "Cookie: color=blue&color=green&color=red;"
        // which gets parsed by the cookie parser as { color: "blue&color=green&color=red" }.
        // To parse it correctly, we need to prepend the parameter name and then use the querystring parser.
        parsedValue = querystring.parse(`${param.name}=${value}`)[param.name];
      }
    }
    else {
      // Non-exploded form params are comma-delimited (e.g. "color=blue,green,red")
      parsedValue = value.split(",");
    }
  }

  return parse.arrayContents(parsedValue, parseInfo);
}

/**
 * Parses an object using OpenAPI "form" style syntax.
 *
 * @see https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#style-examples
 *
 * @param {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {object|undefined}  - The parsed value
 */
function parseFormObject (parseInfo) {
  let value = parseInfo.valueOrDefault;
  let parsedValue = value;

  if (typeof value === "string") {
    parsedValue = {};

    if (parseInfo.param.explode) {
      // Exploded values use querystring format (e.g. "foo=1&bar=2&baz=3")
      parsedValue = querystring.parse(value);
    }
    else {
      // Non-exploded values use a "key,value" format (e.g. "foo,1,bar,2,baz,3")
      let values = parseInfo.valueOrDefault.split(",");

      for (let i = 0; i < values.length; i += 2) {
        let key = values[i];
        let value = values[i + 1];
        parsedValue[key] = value;
      }
    }
  }

  return parse.objectContents(parsedValue, parseInfo);
}
