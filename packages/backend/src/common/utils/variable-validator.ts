export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateVariableValue(
  variableName: string,
  value: string | null | undefined,
  rules: string,
): ValidationResult {
  const errors: string[] = [];

  if (!rules || rules.trim() === '') {
    return { valid: true, errors };
  }

  const ruleList = rules.split('|').map((r) => r.trim());
  const isNullable = ruleList.includes('nullable');
  const isRequired = ruleList.includes('required');
  const isEmpty = value === null || value === undefined || value === '';

  if (isEmpty) {
    if (isRequired) {
      errors.push(`${variableName} is required.`);
    }
    // If nullable or not required, skip remaining rules for empty values
    if (isNullable || !isRequired) {
      return { valid: errors.length === 0, errors };
    }
    return { valid: false, errors };
  }

  const isNumericType = ruleList.includes('numeric') || ruleList.includes('integer');

  for (const rule of ruleList) {
    if (rule === 'required' || rule === 'nullable') {
      continue;
    }

    if (rule === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${variableName} must be a string.`);
      }
    } else if (rule === 'numeric') {
      if (isNaN(Number(value))) {
        errors.push(`${variableName} must be numeric.`);
      }
    } else if (rule === 'integer') {
      if (!Number.isInteger(Number(value)) || isNaN(Number(value))) {
        errors.push(`${variableName} must be an integer.`);
      }
    } else if (rule === 'boolean') {
      if (!['true', 'false', '1', '0'].includes(value!)) {
        errors.push(`${variableName} must be a boolean (true, false, 1, or 0).`);
      }
    } else if (rule.startsWith('between:')) {
      const params = rule.slice('between:'.length).split(',');
      if (params.length === 2) {
        const min = Number(params[0]);
        const max = Number(params[1]);
        const numVal = Number(value);
        if (isNaN(numVal) || numVal < min || numVal > max) {
          errors.push(`${variableName} must be between ${min} and ${max}.`);
        }
      }
    } else if (rule.startsWith('in:')) {
      const options = rule.slice('in:'.length).split(',');
      if (!options.includes(value!)) {
        errors.push(
          `${variableName} must be one of: ${options.join(', ')}.`,
        );
      }
    } else if (rule.startsWith('regex:')) {
      const pattern = rule.slice('regex:'.length);
      // Strip surrounding delimiters if present (e.g. /pattern/)
      const cleaned = pattern.startsWith('/') && pattern.lastIndexOf('/') > 0
        ? pattern.slice(1, pattern.lastIndexOf('/'))
        : pattern;
      try {
        const regex = new RegExp(cleaned);
        if (!regex.test(value!)) {
          errors.push(`${variableName} does not match the required pattern.`);
        }
      } catch {
        errors.push(`${variableName} has an invalid regex rule.`);
      }
    } else if (rule.startsWith('min:')) {
      const min = Number(rule.slice('min:'.length));
      if (isNumericType) {
        if (isNaN(Number(value)) || Number(value) < min) {
          errors.push(`${variableName} must be at least ${min}.`);
        }
      } else {
        if (value!.length < min) {
          errors.push(`${variableName} must be at least ${min} characters.`);
        }
      }
    } else if (rule.startsWith('max:')) {
      const max = Number(rule.slice('max:'.length));
      if (isNumericType) {
        if (isNaN(Number(value)) || Number(value) > max) {
          errors.push(`${variableName} must be no more than ${max}.`);
        }
      } else {
        if (value!.length > max) {
          errors.push(
            `${variableName} must be no more than ${max} characters.`,
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateServerVariables(
  variables: Record<string, string>,
  eggVariables: {
    envVariable: string;
    name: string;
    rules: string;
    defaultValue: string;
  }[],
): { valid: boolean; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};

  for (const eggVar of eggVariables) {
    const value = variables[eggVar.envVariable] ?? eggVar.defaultValue ?? null;
    const result = validateVariableValue(eggVar.name, value, eggVar.rules);
    if (!result.valid) {
      errors[eggVar.envVariable] = result.errors;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
