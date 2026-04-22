import type { Doc } from "../_generated/dataModel";

export function kilogramsToGrams(value: number) {
  return value * 1000;
}

export function poundsToGrams(value: number) {
  return value * 453.59237;
}

export function centimetersToMillimeters(value: number) {
  return value * 10;
}

export function inchesToMillimeters(value: number) {
  return value * 25.4;
}

export function milesToMeters(value: number) {
  return value * 1609.344;
}

export function feetToMeters(value: number) {
  return value * 0.3048;
}

export function kilometersToMeters(value: number) {
  return value * 1000;
}

export function toCanonicalWeight(value: number, unit: Doc<"templateSets">["prescription"]["weightUnit"] | string) {
  switch (unit) {
    case "g":
      return value;
    case "kg":
      return kilogramsToGrams(value);
    case "lb":
      return poundsToGrams(value);
    default:
      return value;
  }
}

export function toCanonicalDistance(value: number, unit: Doc<"templateSets">["prescription"]["distanceUnit"] | string) {
  switch (unit) {
    case "m":
      return value;
    case "km":
      return kilometersToMeters(value);
    case "ft":
      return feetToMeters(value);
    case "mi":
      return milesToMeters(value);
    default:
      return value;
  }
}

export function toCanonicalMeasurement(value: number, unit: string) {
  switch (unit) {
    case "kg":
      return { valueCanonical: kilogramsToGrams(value), canonicalUnit: "g" as const };
    case "g":
      return { valueCanonical: value, canonicalUnit: "g" as const };
    case "lb":
      return { valueCanonical: poundsToGrams(value), canonicalUnit: "g" as const };
    case "cm":
      return {
        valueCanonical: centimetersToMillimeters(value),
        canonicalUnit: "mm" as const,
      };
    case "mm":
      return { valueCanonical: value, canonicalUnit: "mm" as const };
    case "in":
      return { valueCanonical: inchesToMillimeters(value), canonicalUnit: "mm" as const };
    case "%":
      return { valueCanonical: value, canonicalUnit: "percent" as const };
    default:
      return { valueCanonical: value, canonicalUnit: "percent" as const };
  }
}
