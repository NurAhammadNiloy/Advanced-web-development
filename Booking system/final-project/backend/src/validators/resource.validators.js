// src/validators/resource.validators.js
import { body } from "express-validator";

// Validation rules for POST /api/resources
export const resourceValidators = [
  body("resourceName")
    .exists({ checkFalsy: true })
    .withMessage("resourceName is required")
    .isString()
    .withMessage("resourceName must be a string")
    .trim()
    .matches(/^[a-zA-Z0-9äöåÄÖÅ \-]+$/)
    .withMessage("resourceName can only contain letters, numbers, spaces and hyphens")
    .matches(/[a-zA-ZäöåÄÖÅ]/)
    .withMessage("resourceName must contain at least one letter")
    .not().matches(/\s{2,}/)
    .withMessage("resourceName cannot contain double spaces")
    .not().matches(/^(test|aaa+|12345|room|new resource)$/i)
    .withMessage("Please provide a meaningful resource name")
    .isLength({ min: 5, max: 30 })
    .withMessage("resourceName must be 5-30 characters"),

  body("resourceDescription")
    .exists({ checkFalsy: true })
    .withMessage("resourceDescription is required")
    .isString()
    .withMessage("resourceDescription must be a string")
    .trim()
    .isLength({ min: 10, max: 150 })
    .withMessage("resourceDescription must be 10-150 characters")
    .matches(/[a-zA-ZäöåÄÖÅ]/)
    .withMessage("resourceDescription must contain letters")
    .not().matches(/(.)\1{3,}/)
    .withMessage("resourceDescription cannot contain repeated junk characters")
    .custom((value) => {
      if (value.trim().split(/\s+/).length < 2) {
        throw new Error("resourceDescription must contain at least 2 words");
      }
      return true;
    })
    .custom((value, { req }) => {
      if (value.trim().toLowerCase() === req.body.resourceName?.trim().toLowerCase()) {
        throw new Error("resourceDescription cannot be identical to the resource name");
      }
      return true;
    }),

  body("resourceAvailable")
    .exists()
    .withMessage("resourceAvailable is required")
    .isBoolean()
    .withMessage("resourceAvailable must be boolean"),

  body("resourcePrice")
    .exists()
    .withMessage("resourcePrice is required")
    .isFloat({ min: 0, max: 9999.99 })
    .withMessage("resourcePrice must be a non-negative number up to 9999.99")
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error("resourcePrice can have at most 2 decimal places and no scientific notation");
      }
      return true;
    }),

  body("resourcePriceUnit")
    .exists({ checkFalsy: true })
    .withMessage("resourcePriceUnit is required")
    .isString()
    .withMessage("resourcePriceUnit must be a string")
    .trim()
    .isIn(["hour", "day", "week", "month"])
    .withMessage("resourcePriceUnit must be 'hour', 'day', 'week', or 'month'"),
];