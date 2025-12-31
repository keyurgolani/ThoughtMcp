/**
 * Built-in Validators
 *
 * Provides built-in validators for common patterns:
 * - Email validation
 * - URL validation
 * - UUID validation
 * - ISO date validation
 * - JSON validation
 *
 * Requirements: 3.6
 */

import type { CustomValidatorResult } from "./custom-validators.js";

/**
 * Email validation result with additional details
 */
export interface EmailValidationResult extends CustomValidatorResult {
  /** The local part of the email (before @) if valid */
  localPart?: string;
  /** The domain part of the email (after @) if valid */
  domain?: string;
}

/**
 * URL validation result with additional details
 */
export interface URLValidationResult extends CustomValidatorResult {
  /** The protocol of the URL if valid */
  protocol?: string;
  /** The hostname of the URL if valid */
  hostname?: string;
  /** The port of the URL if valid */
  port?: string;
  /** The pathname of the URL if valid */
  pathname?: string;
}

/**
 * UUID validation result with additional details
 */
export interface UUIDValidationResult extends CustomValidatorResult {
  /** The UUID version if valid */
  version?: number;
}

/**
 * ISO date validation result with additional details
 */
export interface ISODateValidationResult extends CustomValidatorResult {
  /** The parsed Date object if valid */
  parsedDate?: Date;
}

/**
 * JSON validation result with additional details
 */
export interface JSONValidationResult extends CustomValidatorResult {
  /** The parsed JSON value if valid */
  parsedValue?: unknown;
}

/**
 * Email validator configuration
 */
export interface EmailValidatorConfig {
  /** Allow plus addressing (e.g., user+tag@example.com). Default: true */
  allowPlusAddressing?: boolean;
  /** Allow IP address domains (e.g., user@[192.168.1.1]). Default: false */
  allowIPDomain?: boolean;
  /** Maximum length for the email. Default: 254 (RFC 5321) */
  maxLength?: number;
}

/**
 * URL validator configuration
 */
export interface URLValidatorConfig {
  /** Allowed protocols. Default: ['http', 'https'] */
  allowedProtocols?: string[];
  /** Require a protocol. Default: true */
  requireProtocol?: boolean;
  /** Allow localhost URLs. Default: true */
  allowLocalhost?: boolean;
  /** Allow IP address hosts. Default: true */
  allowIPAddress?: boolean;
}

/**
 * UUID validator configuration
 */
export interface UUIDValidatorConfig {
  /** Allowed UUID versions. Default: [1, 2, 3, 4, 5] */
  allowedVersions?: number[];
  /** Allow nil UUID (all zeros). Default: true */
  allowNil?: boolean;
}

/**
 * ISO date validator configuration
 */
export interface ISODateValidatorConfig {
  /** Require time component. Default: false */
  requireTime?: boolean;
  /** Require timezone. Default: false */
  requireTimezone?: boolean;
  /** Minimum date allowed */
  minDate?: Date;
  /** Maximum date allowed */
  maxDate?: Date;
}

/**
 * JSON validator configuration
 */
export interface JSONValidatorConfig {
  /** Maximum depth of nested objects/arrays. Default: 100 */
  maxDepth?: number;
  /** Maximum string length. Default: 1MB */
  maxLength?: number;
}

// ============================================================================
// Email Validation Helper Functions
// ============================================================================

/** Creates an error result for email validation */
function emailError(
  message: string,
  expectedDescription: string,
  suggestion: string
): EmailValidationResult {
  return { valid: false, message, expectedDescription, suggestion };
}

/** Validates email local part characters */
function validateEmailLocalPartChars(
  localPart: string,
  allowPlusAddressing: boolean
): EmailValidationResult | null {
  const plusPattern = allowPlusAddressing ? "\\+" : "";
  const localPartPattern = new RegExp(`^[a-zA-Z0-9.\\-_${plusPattern}]+$`);

  if (!localPartPattern.test(localPart)) {
    const allowedChars = allowPlusAddressing ? ", and plus signs" : "";
    return emailError(
      "Email local part contains invalid characters",
      `Local part with alphanumeric characters, dots, hyphens, underscores${allowedChars}`,
      "Use only allowed characters in the local part"
    );
  }

  if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) {
    return emailError(
      "Email local part cannot start or end with a dot, or contain consecutive dots",
      "Local part without leading/trailing or consecutive dots",
      "Remove leading, trailing, or consecutive dots from the local part"
    );
  }

  return null;
}

/** Validates email IP domain */
function validateEmailIPDomain(ip: string, allowIPDomain: boolean): EmailValidationResult | null {
  if (!allowIPDomain) {
    return emailError(
      "IP address domains are not allowed",
      "Email with a hostname domain",
      "Use a hostname domain like example.com instead of an IP address"
    );
  }

  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Pattern.test(ip)) {
    return emailError(
      "Invalid IP address in email domain",
      "Valid IPv4 address in brackets",
      "Use a valid IPv4 address like [192.168.1.1]"
    );
  }

  return null;
}

/** Validates email hostname domain */
function validateEmailHostnameDomain(domain: string): EmailValidationResult | null {
  const domainPattern =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

  if (!domainPattern.test(domain)) {
    return emailError(
      "Email domain is invalid",
      "Valid domain like example.com",
      "Use a valid domain name with proper format"
    );
  }

  const lastDotIndex = domain.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return emailError(
      "Email domain must have a top-level domain",
      "Domain with TLD like .com, .org, .net",
      "Add a top-level domain like .com to the domain"
    );
  }

  const tld = domain.substring(lastDotIndex + 1);
  if (tld.length < 2) {
    return emailError(
      "Email top-level domain must be at least 2 characters",
      "TLD with at least 2 characters",
      "Use a valid TLD like .com, .org, or .net"
    );
  }

  return null;
}

/**
 * Validates an email address
 *
 * Validates according to RFC 5322 with practical constraints.
 *
 * @param value - The value to validate
 * @param config - Optional configuration
 * @returns Validation result with email parts if valid
 *
 * Requirements: 3.6
 */
export function validateEmail(
  value: unknown,
  config: EmailValidatorConfig = {}
): EmailValidationResult {
  const { allowPlusAddressing = true, allowIPDomain = false, maxLength = 254 } = config;

  if (typeof value !== "string") {
    return emailError(
      "Email must be a string",
      "A valid email address string",
      "Provide a string value for the email address"
    );
  }

  if (value.length === 0) {
    return emailError(
      "Email cannot be empty",
      "A non-empty email address",
      "Provide a valid email address like user@example.com"
    );
  }

  if (value.length > maxLength) {
    return emailError(
      `Email exceeds maximum length of ${maxLength} characters`,
      `Email with at most ${maxLength} characters`,
      `Shorten the email address to ${maxLength} characters or less`
    );
  }

  return validateEmailParts(value, allowPlusAddressing, allowIPDomain);
}

/** Validates email parts (local and domain) */
function validateEmailParts(
  value: string,
  allowPlusAddressing: boolean,
  allowIPDomain: boolean
): EmailValidationResult {
  const atIndex = value.lastIndexOf("@");
  if (atIndex === -1) {
    return emailError(
      "Email must contain an @ symbol",
      "Email in format local@domain",
      "Add an @ symbol to separate the local part from the domain"
    );
  }

  const localPart = value.substring(0, atIndex);
  const domain = value.substring(atIndex + 1);

  const localError = validateEmailLocalPart(localPart, allowPlusAddressing);
  if (localError) return localError;

  const domainError = validateEmailDomain(domain, allowIPDomain);
  if (domainError) return domainError;

  return { valid: true, localPart, domain };
}

/** Validates email local part */
function validateEmailLocalPart(
  localPart: string,
  allowPlusAddressing: boolean
): EmailValidationResult | null {
  if (localPart.length === 0) {
    return emailError(
      "Email local part (before @) cannot be empty",
      "Email with a valid local part",
      "Add a username before the @ symbol"
    );
  }

  if (localPart.length > 64) {
    return emailError(
      "Email local part exceeds maximum length of 64 characters",
      "Email local part with at most 64 characters",
      "Shorten the local part to 64 characters or less"
    );
  }

  return validateEmailLocalPartChars(localPart, allowPlusAddressing);
}

/** Validates email domain */
function validateEmailDomain(domain: string, allowIPDomain: boolean): EmailValidationResult | null {
  if (domain.length === 0) {
    return emailError(
      "Email domain (after @) cannot be empty",
      "Email with a valid domain",
      "Add a domain after the @ symbol"
    );
  }

  const ipDomainMatch = domain.match(/^\[(.+)\]$/);
  if (ipDomainMatch) {
    return validateEmailIPDomain(ipDomainMatch[1], allowIPDomain);
  }

  return validateEmailHostnameDomain(domain);
}

// ============================================================================
// URL Validation Helper Functions
// ============================================================================

/** Creates an error result for URL validation */
function urlError(
  message: string,
  expectedDescription: string,
  suggestion: string
): URLValidationResult {
  return { valid: false, message, expectedDescription, suggestion };
}

/** Validates URL protocol */
function validateURLProtocol(
  protocol: string,
  allowedProtocols: string[]
): URLValidationResult | null {
  if (!allowedProtocols.includes(protocol)) {
    return urlError(
      `Protocol '${protocol}' is not allowed`,
      `URL with protocol: ${allowedProtocols.join(", ")}`,
      `Use one of the allowed protocols: ${allowedProtocols.join(", ")}`
    );
  }
  return null;
}

/** Validates URL hostname restrictions */
function validateURLHostname(
  hostname: string,
  allowLocalhost: boolean,
  allowIPAddress: boolean
): URLValidationResult | null {
  const lowerHostname = hostname.toLowerCase();

  if (!allowLocalhost) {
    const isLocalhost =
      lowerHostname === "localhost" || lowerHostname === "127.0.0.1" || lowerHostname === "::1";
    if (isLocalhost) {
      return urlError(
        "Localhost URLs are not allowed",
        "URL with a non-localhost hostname",
        "Use a public hostname instead of localhost"
      );
    }
  }

  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = /^\[?([a-fA-F0-9:]+)\]?$/;
  const isIPAddress = ipv4Pattern.test(lowerHostname) || ipv6Pattern.test(lowerHostname);
  const isLoopback = lowerHostname === "127.0.0.1" || lowerHostname === "::1";

  if (!allowIPAddress && isIPAddress && !isLoopback) {
    return urlError(
      "IP address URLs are not allowed",
      "URL with a hostname instead of IP address",
      "Use a hostname like example.com instead of an IP address"
    );
  }

  return null;
}

/**
 * Validates a URL
 *
 * Validates URLs with configurable protocol requirements and host restrictions.
 *
 * @param value - The value to validate
 * @param config - Optional configuration
 * @returns Validation result with URL parts if valid
 *
 * Requirements: 3.6
 */
export function validateURL(value: unknown, config: URLValidatorConfig = {}): URLValidationResult {
  const {
    allowedProtocols = ["http", "https"],
    requireProtocol = true,
    allowLocalhost = true,
    allowIPAddress = true,
  } = config;

  if (typeof value !== "string") {
    return urlError(
      "URL must be a string",
      "A valid URL string",
      "Provide a string value for the URL"
    );
  }

  if (value.length === 0) {
    return urlError(
      "URL cannot be empty",
      "A non-empty URL",
      "Provide a valid URL like https://example.com"
    );
  }

  let urlString = value;
  if (!requireProtocol && !value.includes("://")) {
    urlString = `https://${value}`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    return urlError(
      "Invalid URL format",
      "A properly formatted URL",
      "Ensure the URL follows the format protocol://hostname/path"
    );
  }

  const protocol = parsedUrl.protocol.replace(":", "");
  const protocolError = validateURLProtocol(protocol, allowedProtocols);
  if (protocolError) return protocolError;

  const hostnameError = validateURLHostname(parsedUrl.hostname, allowLocalhost, allowIPAddress);
  if (hostnameError) return hostnameError;

  return {
    valid: true,
    protocol,
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || undefined,
    pathname: parsedUrl.pathname,
  };
}

// ============================================================================
// UUID Validation
// ============================================================================

/** Creates an error result for UUID validation */
function uuidError(
  message: string,
  expectedDescription: string,
  suggestion: string
): UUIDValidationResult {
  return { valid: false, message, expectedDescription, suggestion };
}

/**
 * Validates a UUID
 *
 * Validates UUIDs according to RFC 4122.
 * Supports versions 1-5 and nil UUID.
 *
 * @param value - The value to validate
 * @param config - Optional configuration
 * @returns Validation result with UUID version if valid
 *
 * Requirements: 3.6
 */
export function validateUUID(
  value: unknown,
  config: UUIDValidatorConfig = {}
): UUIDValidationResult {
  const { allowedVersions = [1, 2, 3, 4, 5], allowNil = true } = config;

  if (typeof value !== "string") {
    return uuidError(
      "UUID must be a string",
      "A valid UUID string",
      "Provide a string value for the UUID"
    );
  }

  if (value.length === 0) {
    return uuidError(
      "UUID cannot be empty",
      "A non-empty UUID",
      "Provide a valid UUID like 550e8400-e29b-41d4-a716-446655440000"
    );
  }

  const normalized = value.toLowerCase();
  const nilUUID = "00000000-0000-0000-0000-000000000000";

  if (normalized === nilUUID) {
    if (!allowNil) {
      return uuidError("Nil UUID is not allowed", "A non-nil UUID", "Provide a valid non-nil UUID");
    }
    return { valid: true, version: 0 };
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  if (!uuidPattern.test(normalized)) {
    const relaxedPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    if (relaxedPattern.test(normalized)) {
      const versionChar = normalized.charAt(14);
      const variantChar = normalized.charAt(19);
      const version = parseInt(versionChar, 16);
      const variant = parseInt(variantChar, 16);

      if (version < 1 || version > 5) {
        return uuidError(
          `Invalid UUID version: ${version}`,
          "UUID with version 1-5",
          "Use a UUID with a valid version (1-5)"
        );
      }
      if (variant < 8 || variant > 11) {
        return uuidError(
          "Invalid UUID variant",
          "UUID with RFC 4122 variant (8, 9, a, or b)",
          "Use a UUID with a valid variant"
        );
      }
    }
    return uuidError(
      "Invalid UUID format",
      "UUID in format xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx",
      "Provide a valid UUID like 550e8400-e29b-41d4-a716-446655440000"
    );
  }

  const version = parseInt(normalized.charAt(14), 10);
  if (!allowedVersions.includes(version)) {
    return uuidError(
      `UUID version ${version} is not allowed`,
      `UUID with version: ${allowedVersions.join(", ")}`,
      `Use a UUID with one of the allowed versions: ${allowedVersions.join(", ")}`
    );
  }

  return { valid: true, version };
}

// ============================================================================
// ISO Date Validation Helper Functions
// ============================================================================

/** Creates an error result for ISO date validation */
function isoDateError(
  message: string,
  expectedDescription: string,
  suggestion: string
): ISODateValidationResult {
  return { valid: false, message, expectedDescription, suggestion };
}

/** Validates ISO date format requirements */
function validateISODateRequirements(
  _value: string,
  hasTime: boolean,
  hasTimezone: boolean,
  requireTime: boolean,
  requireTimezone: boolean
): ISODateValidationResult | null {
  if (requireTime && !hasTime) {
    return isoDateError(
      "ISO date must include a time component",
      "ISO date with time like 2024-01-15T10:30:00",
      "Add a time component in format THH:mm:ss"
    );
  }

  if (requireTimezone && !hasTimezone) {
    return isoDateError(
      "ISO date must include a timezone",
      "ISO date with timezone like 2024-01-15T10:30:00Z",
      "Add a timezone like Z or +00:00"
    );
  }

  return null;
}

/** Validates ISO date format pattern */
function validateISODateFormat(
  value: string,
  hasTime: boolean,
  hasTimezone: boolean
): ISODateValidationResult | null {
  const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?$/;
  const dateTimeTzPattern =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

  let isValidFormat = false;
  if (hasTimezone) {
    isValidFormat = dateTimeTzPattern.test(value);
  } else if (hasTime) {
    isValidFormat = dateTimePattern.test(value);
  } else {
    isValidFormat = dateOnlyPattern.test(value);
  }

  if (!isValidFormat) {
    return isoDateError(
      "Invalid ISO 8601 date format",
      "Date in format YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, or YYYY-MM-DDTHH:mm:ssZ",
      "Use a valid ISO 8601 format like 2024-01-15 or 2024-01-15T10:30:00Z"
    );
  }

  return null;
}

/** Validates ISO date components (month, day) */
function validateISODateComponents(value: string): ISODateValidationResult | null {
  const parts = value.split("T")[0].split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (month < 1 || month > 12) {
    return isoDateError(
      `Invalid month: ${month}`,
      "Month between 01 and 12",
      "Use a valid month value (01-12)"
    );
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return isoDateError(
      `Invalid day: ${day} for month ${month}`,
      `Day between 01 and ${daysInMonth} for month ${month}`,
      `Use a valid day value (01-${daysInMonth}) for month ${month}`
    );
  }

  return null;
}

/** Validates ISO date range constraints */
function validateISODateRange(
  parsedDate: Date,
  minDate?: Date,
  maxDate?: Date
): ISODateValidationResult | null {
  if (minDate && parsedDate < minDate) {
    return isoDateError(
      "Date is before minimum allowed date",
      `Date on or after ${minDate.toISOString()}`,
      `Use a date on or after ${minDate.toISOString().split("T")[0]}`
    );
  }

  if (maxDate && parsedDate > maxDate) {
    return isoDateError(
      "Date is after maximum allowed date",
      `Date on or before ${maxDate.toISOString()}`,
      `Use a date on or before ${maxDate.toISOString().split("T")[0]}`
    );
  }

  return null;
}

/**
 * Validates an ISO 8601 date string
 *
 * Validates dates in ISO 8601 format with optional time and timezone.
 *
 * @param value - The value to validate
 * @param config - Optional configuration
 * @returns Validation result with parsed date if valid
 *
 * Requirements: 3.6
 */
export function validateISODate(
  value: unknown,
  config: ISODateValidatorConfig = {}
): ISODateValidationResult {
  const { requireTime = false, requireTimezone = false, minDate, maxDate } = config;

  if (typeof value !== "string") {
    return isoDateError(
      "ISO date must be a string",
      "A valid ISO 8601 date string",
      "Provide a string value for the date"
    );
  }

  if (value.length === 0) {
    return isoDateError(
      "ISO date cannot be empty",
      "A non-empty ISO 8601 date",
      "Provide a valid ISO date like 2024-01-15 or 2024-01-15T10:30:00Z"
    );
  }

  const hasTime = value.includes("T");
  const hasTimezone = value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value);

  const requirementsError = validateISODateRequirements(
    value,
    hasTime,
    hasTimezone,
    requireTime,
    requireTimezone
  );
  if (requirementsError) return requirementsError;

  const formatError = validateISODateFormat(value, hasTime, hasTimezone);
  if (formatError) return formatError;

  const componentsError = validateISODateComponents(value);
  if (componentsError) return componentsError;

  const parsedDate = new Date(value);
  if (isNaN(parsedDate.getTime())) {
    return isoDateError(
      "Invalid date value",
      "A valid date",
      "Ensure the date values are valid (e.g., month 01-12, day 01-31)"
    );
  }

  const rangeError = validateISODateRange(parsedDate, minDate, maxDate);
  if (rangeError) return rangeError;

  return { valid: true, parsedDate };
}

// ============================================================================
// JSON Validation
// ============================================================================

/** Creates an error result for JSON validation */
function jsonError(
  message: string,
  expectedDescription: string,
  suggestion: string
): JSONValidationResult {
  return { valid: false, message, expectedDescription, suggestion };
}

/**
 * Calculate the maximum nesting depth of a JSON value
 *
 * @param value - The parsed JSON value
 * @param currentDepth - Current depth (for recursion)
 * @returns Maximum nesting depth
 */
function getJSONDepth(value: unknown, currentDepth: number = 0): number {
  if (value === null || typeof value !== "object") {
    return currentDepth;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return currentDepth + 1;
    }
    return Math.max(...value.map((item) => getJSONDepth(item, currentDepth + 1)));
  }

  const keys = Object.keys(value);
  if (keys.length === 0) {
    return currentDepth + 1;
  }

  return Math.max(
    ...keys.map((key) => getJSONDepth((value as Record<string, unknown>)[key], currentDepth + 1))
  );
}

/**
 * Validates a JSON string
 *
 * Validates that a string is valid JSON and optionally checks depth constraints.
 *
 * @param value - The value to validate
 * @param config - Optional configuration
 * @returns Validation result with parsed value if valid
 *
 * Requirements: 3.6
 */
export function validateJSON(
  value: unknown,
  config: JSONValidatorConfig = {}
): JSONValidationResult {
  const { maxDepth = 100, maxLength = 1024 * 1024 } = config;

  if (typeof value !== "string") {
    return jsonError(
      "JSON must be a string",
      "A valid JSON string",
      "Provide a string value containing JSON"
    );
  }

  if (value.length === 0) {
    return jsonError(
      "JSON string cannot be empty",
      "A non-empty JSON string",
      "Provide a valid JSON string like {} or []"
    );
  }

  if (value.length > maxLength) {
    return jsonError(
      `JSON string exceeds maximum length of ${maxLength} characters`,
      `JSON string with at most ${maxLength} characters`,
      `Reduce the JSON string to ${maxLength} characters or less`
    );
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(value);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonError(
      `Invalid JSON: ${errorMessage}`,
      "Valid JSON syntax",
      "Check for syntax errors like missing quotes, commas, or brackets"
    );
  }

  const depth = getJSONDepth(parsedValue);
  if (depth > maxDepth) {
    return jsonError(
      `JSON exceeds maximum nesting depth of ${maxDepth}`,
      `JSON with nesting depth at most ${maxDepth}`,
      "Flatten the JSON structure to reduce nesting depth"
    );
  }

  return { valid: true, parsedValue };
}

/**
 * Built-in validator names
 */
export const BUILT_IN_VALIDATORS = {
  EMAIL: "builtIn:email",
  URL: "builtIn:url",
  UUID: "builtIn:uuid",
  ISO_DATE: "builtIn:isoDate",
  JSON: "builtIn:json",
} as const;

/**
 * Type for built-in validator names
 */
export type BuiltInValidatorName = (typeof BUILT_IN_VALIDATORS)[keyof typeof BUILT_IN_VALIDATORS];

// ============================================================================
// BuiltInValidators Class
// ============================================================================

/** Registry interface for validator registration */
interface ValidatorRegistry {
  register: (config: {
    name: string;
    description: string;
    validate: (ctx: { fieldValue: unknown }) => {
      valid: boolean;
      message?: string;
      expectedDescription?: string;
      suggestion?: string;
    };
    defaultMessage?: string;
    defaultSuggestion?: string;
  }) => void;
}

/**
 * BuiltInValidators class
 *
 * Provides a collection of built-in validators that can be registered
 * with a CustomValidatorRegistry for use in validation schemas.
 *
 * Requirements: 3.6
 */
export class BuiltInValidators {
  private readonly emailConfig: EmailValidatorConfig;
  private readonly urlConfig: URLValidatorConfig;
  private readonly uuidConfig: UUIDValidatorConfig;
  private readonly isoDateConfig: ISODateValidatorConfig;
  private readonly jsonConfig: JSONValidatorConfig;

  constructor(
    config: {
      email?: EmailValidatorConfig;
      url?: URLValidatorConfig;
      uuid?: UUIDValidatorConfig;
      isoDate?: ISODateValidatorConfig;
      json?: JSONValidatorConfig;
    } = {}
  ) {
    this.emailConfig = config.email ?? {};
    this.urlConfig = config.url ?? {};
    this.uuidConfig = config.uuid ?? {};
    this.isoDateConfig = config.isoDate ?? {};
    this.jsonConfig = config.json ?? {};
  }

  /**
   * Register all built-in validators with a CustomValidatorRegistry
   *
   * @param registry - The registry to register validators with
   *
   * Requirements: 3.6
   */
  registerAll(registry: ValidatorRegistry): void {
    this.registerEmail(registry);
    this.registerURL(registry);
    this.registerUUID(registry);
    this.registerISODate(registry);
    this.registerJSON(registry);
  }

  /** Register the email validator */
  registerEmail(registry: ValidatorRegistry): void {
    const config = this.emailConfig;
    registry.register({
      name: BUILT_IN_VALIDATORS.EMAIL,
      description: "Validates email addresses according to RFC 5322",
      defaultMessage: "Invalid email address",
      defaultSuggestion: "Provide a valid email address like user@example.com",
      validate: (ctx) => validateEmail(ctx.fieldValue, config),
    });
  }

  /** Register the URL validator */
  registerURL(registry: ValidatorRegistry): void {
    const config = this.urlConfig;
    registry.register({
      name: BUILT_IN_VALIDATORS.URL,
      description: "Validates URLs with configurable protocol and host restrictions",
      defaultMessage: "Invalid URL",
      defaultSuggestion: "Provide a valid URL like https://example.com",
      validate: (ctx) => validateURL(ctx.fieldValue, config),
    });
  }

  /** Register the UUID validator */
  registerUUID(registry: ValidatorRegistry): void {
    const config = this.uuidConfig;
    registry.register({
      name: BUILT_IN_VALIDATORS.UUID,
      description: "Validates UUIDs according to RFC 4122",
      defaultMessage: "Invalid UUID",
      defaultSuggestion: "Provide a valid UUID like 550e8400-e29b-41d4-a716-446655440000",
      validate: (ctx) => validateUUID(ctx.fieldValue, config),
    });
  }

  /** Register the ISO date validator */
  registerISODate(registry: ValidatorRegistry): void {
    const config = this.isoDateConfig;
    registry.register({
      name: BUILT_IN_VALIDATORS.ISO_DATE,
      description: "Validates ISO 8601 date strings",
      defaultMessage: "Invalid ISO date",
      defaultSuggestion: "Provide a valid ISO date like 2024-01-15 or 2024-01-15T10:30:00Z",
      validate: (ctx) => validateISODate(ctx.fieldValue, config),
    });
  }

  /** Register the JSON validator */
  registerJSON(registry: ValidatorRegistry): void {
    const config = this.jsonConfig;
    registry.register({
      name: BUILT_IN_VALIDATORS.JSON,
      description: "Validates JSON strings",
      defaultMessage: "Invalid JSON",
      defaultSuggestion: "Provide a valid JSON string like {} or []",
      validate: (ctx) => validateJSON(ctx.fieldValue, config),
    });
  }
}

/**
 * Create a BuiltInValidators instance with default configuration
 *
 * @param config - Optional configuration for validators
 * @returns A new BuiltInValidators instance
 *
 * Requirements: 3.6
 */
export function createBuiltInValidators(config?: {
  email?: EmailValidatorConfig;
  url?: URLValidatorConfig;
  uuid?: UUIDValidatorConfig;
  isoDate?: ISODateValidatorConfig;
  json?: JSONValidatorConfig;
}): BuiltInValidators {
  return new BuiltInValidators(config);
}
