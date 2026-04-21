export type ValidationResult = {
  valid: boolean;
  message?: string;
};

const USERNAME_REGEX = /^[A-Za-z0-9._-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): ValidationResult {
  const value = email.trim();

  if (!value) {
    return { valid: false, message: "Email is required." };
  }

  if (!EMAIL_REGEX.test(value)) {
    return { valid: false, message: "Enter a valid email address." };
  }

  return { valid: true };
}

export function validateUsername(username: string): ValidationResult {
  const value = username.trim();

  if (!value) {
    return { valid: false, message: "Username is required." };
  }

  if (value.length < 3 || value.length > 32) {
    return {
      valid: false,
      message: "Username must be between 3 and 32 characters.",
    };
  }

  if (!USERNAME_REGEX.test(value)) {
    return {
      valid: false,
      message:
        "Username can only include letters, numbers, dot, underscore, and hyphen.",
    };
  }

  if (/\s/.test(value)) {
    return { valid: false, message: "Username cannot contain spaces." };
  }

  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long.",
    };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber) {
    return {
      valid: false,
      message:
        "Password must include at least one uppercase letter, one lowercase letter, and one number.",
    };
  }

  return { valid: true };
}
