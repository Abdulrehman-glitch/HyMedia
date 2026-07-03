const { z } = require("zod");

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.");

const signupSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email().max(254),
    password: passwordSchema
  })
  .superRefine((data, ctx) => {
    const normalizedPassword = data.password.toLowerCase();
    const emailName = data.email.split("@")[0];
    const displayNameParts = data.displayName.toLowerCase().split(/\s+/).filter(Boolean);

    if (emailName.length >= 3 && normalizedPassword.includes(emailName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must not contain your email name."
      });
    }

    if (displayNameParts.some((part) => part.length >= 3 && normalizedPassword.includes(part))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must not contain your display name."
      });
    }
  });

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128)
});

module.exports = {
  signupSchema,
  loginSchema,
  passwordSchema
};
