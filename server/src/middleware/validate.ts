import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

/** Validates & replaces req.body with the parsed (and type-coerced) result of `schema`. */
export function validateBody(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}
