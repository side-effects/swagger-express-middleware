"use strict";

module.exports = {
  primitive: parsePrimitive,
  arrayContents: parseArrayContents,
  objectContents: parseObjectContents,
};

const ono = require("ono");
const dateFormat = /^\d{4}-\d{2}-\d{2}$/;
const dateTimeFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Parses a primitive value according to specified JSON schema.
 *
 * @param {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {*}                 - The parsed value, or the default value
 */
function parsePrimitive (parseInfo) {
  let { schema } = parseInfo;

  switch (schema.type) {
    case "integer":
      return parseInteger(parseInfo);

    case "number":
      return parseNumber(parseInfo);

    case "boolean":
      return parseBoolean(parseInfo);

    case "string":
      switch (schema.format) {
        case "byte":
          return parseBytes(parseInfo);

        case "binary":
          return parseBinary(parseInfo);

        case "date":
          return parseDate(parseInfo);

        case "date-time":
          return parseDateTime(parseInfo);

        case "password":
        default:
          return parseString(parseInfo);
      }

    default:
      throw ono(`"${schema.type}" is not a JSON Schema primitive type.`);
  }
}

/**
 * Parses the items in the given array according to the array's `items` schema.
 *
 * @param   {arrau}     arr        - The array whose items will be parsed
 * @param   {ParseInfo} parseInfo  - Information about the parameter value being parsed
 * @returns {array}                - Returns the `arr` argument, with its items parsed
 */
function parseArrayContents (arr, parseInfo) {
  if (Array.isArray(arr)) {
    let itemSchema = parseInfo.schema.items;

    for (let [index, item] of arr.entries()) {
      parseInfo.push(index, item, itemSchema);
      arr[index] = parsePrimitive(parseInfo);
      parseInfo.pop();
    }
  }

  return arr;
}

/**
 * Parses the properties of the given object according to the corresponding JSON schemas.
 *
 * @param   {object}    obj       - The object whose properties will be parsed
 * @param   {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {object}              - Returns the `obj` argument, with its properties parsed
 */
function parseObjectContents (obj, parseInfo) {
  if (typeof obj === "object" && obj !== null) {
    let propertySchemas = parseInfo.schema.properties;
    let defaultPropertySchema = { type: "string" };

    for (let [key, item] of Object.entries(obj)) {
      parseInfo.push(key, item, propertySchemas[key] || defaultPropertySchema);
      obj[key] = parsePrimitive(parseInfo);
      parseInfo.pop();
    }
  }

  return obj;
}

/**
 * Parses the given value as an integer.
 *
 * @param {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {number|undefined}  - The parsed value
 */
function parseInteger (parseInfo) {
  let value = parseInfo.valueOrDefault;
  if (typeof value !== "string") {
    return value;
  }

  let parsedValue = parseNumber(parseInfo);

  if (Math.floor(parsedValue) !== parsedValue) {
    throw ono(`"${value}" is not a whole number.`);
  }

  return parsedValue;
}

/**
 * Parses the given value as a float.
 *
 * @param {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {number|undefined}  - The parsed value
 */
function parseNumber (parseInfo) {
  let value = parseInfo.valueOrDefault;
  if (typeof value !== "string") {
    return value;
  }

  let parsedValue = parseFloat(value);

  if (isNaN(parsedValue)) {
    throw ono(`"${value}" is not a valid numeric value.`);
  }

  return parsedValue;
}

/**
 * Parses the given value as a boolean.
 *
 * @param {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {boolean|undefined} - The parsed value
 */
function parseBoolean (parseInfo) {
  let value = parseInfo.valueOrDefault;
  if (typeof value !== "string") {
    return value;
  }

  let normalizedValue = String(value).trim().toLowerCase();
  if (normalizedValue === "true") {
    return true;
  }
  else if (normalizedValue === "false") {
    return false;
  }
  else {
    throw ono(`"${value}" is not a valid boolean value.`);
  }
}

/**
 * Parses the given value as a string.
 *
 * @param {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {string|undefined}  - The parsed value
 */
function parseString (parseInfo) {
  // For all other types, we consider an empty string to be `undefined`.
  // But for strings, we allow empty strings
  if (parseInfo.value === "") {
    return "";
  }

  let value = parseInfo.valueOrDefault;
  if (typeof value !== "string") {
    return value;
  }

  return value;
}

/**
 * Parses the given value as a base64 Buffer.
 *
 * @param {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {Buffer|undefined}  - The parsed value
 */
function parseBytes (parseInfo) {
  let value = parseInfo.valueOrDefault;
  if (typeof value !== "string") {
    return value;
  }

  let buffer = Buffer.from(value, "base64");
  return buffer;
}

/**
 * Parses the given value as a binary Buffer.
 *
 * @param {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {Buffer|undefined}  - The parsed value
 */
function parseBinary (parseInfo) {
  let value = parseInfo.valueOrDefault;
  if (typeof value !== "string") {
    return value;
  }

  let buffer = Buffer.from(value, "binary");
  return buffer;
}

/**
 * Parses the given value as a an ISO 8601 "full-date".
 *
 * @see https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14
 *
 * @param {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {Date|undefined}    - The parsed value
 */
function parseDate (parseInfo) {
  let value = parseInfo.valueOrDefault;
  if (typeof value !== "string") {
    return value;
  }

  if (!dateFormat.test(value)) {
    throw ono(`"${value}" is not a valid date format.`);
  }

  let parsedValue = new Date(value);

  if (isNaN(parsedValue)) {
    throw ono(`"${value}" is not a valid date.`);
  }

  return parsedValue;
}

/**
 * Parses the given value as a an ISO 8601 "date-time".
 *
 * @see https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14
 *
 * @param {ParseInfo} parseInfo - Information about the parameter value being parsed
 * @returns {Date|undefined}    - The parsed value
 */
function parseDateTime (parseInfo) {
  let value = parseInfo.valueOrDefault;
  if (typeof value !== "string") {
    return value;
  }

  if (!dateTimeFormat.test(parseInfo.value)) {
    throw ono(`"${value}" is not a valid date & time format.`);
  }

  let parsedValue = new Date(parseInfo.value);

  if (isNaN(parsedValue)) {
    throw ono(`"${value}" is not a valid date & time.`);
  }

  return parsedValue;
}
