import {
  validateVariableValue,
  validateServerVariables,
} from './variable-validator';

describe('validateVariableValue', () => {
  describe('required rule', () => {
    it('should fail when value is null', () => {
      const result = validateVariableValue('Test', null, 'required');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Test is required.');
    });

    it('should fail when value is undefined', () => {
      const result = validateVariableValue('Test', undefined, 'required');
      expect(result.valid).toBe(false);
    });

    it('should fail when value is empty string', () => {
      const result = validateVariableValue('Test', '', 'required');
      expect(result.valid).toBe(false);
    });

    it('should pass when value is provided', () => {
      const result = validateVariableValue('Test', 'hello', 'required');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('nullable rule', () => {
    it('should pass when value is null', () => {
      const result = validateVariableValue('Test', null, 'nullable');
      expect(result.valid).toBe(true);
    });

    it('should pass when value is undefined', () => {
      const result = validateVariableValue('Test', undefined, 'nullable');
      expect(result.valid).toBe(true);
    });

    it('should pass when value is empty string', () => {
      const result = validateVariableValue('Test', '', 'nullable');
      expect(result.valid).toBe(true);
    });

    it('should still validate non-empty values', () => {
      const result = validateVariableValue('Test', 'abc', 'nullable|numeric');
      expect(result.valid).toBe(false);
    });
  });

  describe('string rule', () => {
    it('should pass for string values', () => {
      const result = validateVariableValue('Test', 'hello', 'string');
      expect(result.valid).toBe(true);
    });
  });

  describe('numeric rule', () => {
    it('should pass for numeric strings', () => {
      expect(validateVariableValue('Test', '42', 'numeric').valid).toBe(true);
      expect(validateVariableValue('Test', '3.14', 'numeric').valid).toBe(true);
      expect(validateVariableValue('Test', '-5', 'numeric').valid).toBe(true);
    });

    it('should fail for non-numeric strings', () => {
      const result = validateVariableValue('Test', 'abc', 'numeric');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Test must be numeric.');
    });
  });

  describe('integer rule', () => {
    it('should pass for integer strings', () => {
      expect(validateVariableValue('Test', '42', 'integer').valid).toBe(true);
      expect(validateVariableValue('Test', '-3', 'integer').valid).toBe(true);
      expect(validateVariableValue('Test', '0', 'integer').valid).toBe(true);
    });

    it('should fail for non-integer values', () => {
      expect(validateVariableValue('Test', '3.14', 'integer').valid).toBe(false);
      expect(validateVariableValue('Test', 'abc', 'integer').valid).toBe(false);
    });
  });

  describe('boolean rule', () => {
    it('should pass for valid boolean values', () => {
      expect(validateVariableValue('Test', 'true', 'boolean').valid).toBe(true);
      expect(validateVariableValue('Test', 'false', 'boolean').valid).toBe(true);
      expect(validateVariableValue('Test', '1', 'boolean').valid).toBe(true);
      expect(validateVariableValue('Test', '0', 'boolean').valid).toBe(true);
    });

    it('should fail for invalid boolean values', () => {
      const result = validateVariableValue('Test', 'yes', 'boolean');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Test must be a boolean (true, false, 1, or 0).',
      );
    });
  });

  describe('between rule', () => {
    it('should pass when numeric value is within range', () => {
      expect(
        validateVariableValue('Test', '5', 'between:1,10').valid,
      ).toBe(true);
      expect(
        validateVariableValue('Test', '1', 'between:1,10').valid,
      ).toBe(true);
      expect(
        validateVariableValue('Test', '10', 'between:1,10').valid,
      ).toBe(true);
    });

    it('should fail when value is outside range', () => {
      const result = validateVariableValue('Test', '15', 'between:1,10');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Test must be between 1 and 10.');
    });

    it('should fail for non-numeric values', () => {
      const result = validateVariableValue('Test', 'abc', 'between:1,10');
      expect(result.valid).toBe(false);
    });
  });

  describe('in rule', () => {
    it('should pass when value is in list', () => {
      expect(
        validateVariableValue('Test', 'a', 'in:a,b,c').valid,
      ).toBe(true);
    });

    it('should fail when value is not in list', () => {
      const result = validateVariableValue('Test', 'd', 'in:a,b,c');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Test must be one of: a, b, c.');
    });
  });

  describe('regex rule', () => {
    it('should pass when value matches pattern', () => {
      expect(
        validateVariableValue('Test', 'abc123', 'regex:/^[a-z0-9]+$/').valid,
      ).toBe(true);
    });

    it('should fail when value does not match pattern', () => {
      const result = validateVariableValue('Test', 'ABC!', 'regex:/^[a-z0-9]+$/');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Test does not match the required pattern.',
      );
    });

    it('should handle regex without delimiters', () => {
      expect(
        validateVariableValue('Test', '123', 'regex:^\\d+$').valid,
      ).toBe(true);
    });

    it('should handle invalid regex gracefully', () => {
      const result = validateVariableValue('Test', 'abc', 'regex:/[invalid/');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Test has an invalid regex rule.');
    });
  });

  describe('min rule', () => {
    it('should validate minimum string length', () => {
      expect(validateVariableValue('Test', 'abc', 'string|min:2').valid).toBe(
        true,
      );
      expect(validateVariableValue('Test', 'a', 'string|min:2').valid).toBe(
        false,
      );
    });

    it('should validate minimum numeric value', () => {
      expect(validateVariableValue('Test', '5', 'numeric|min:3').valid).toBe(
        true,
      );
      expect(validateVariableValue('Test', '1', 'numeric|min:3').valid).toBe(
        false,
      );
    });

    it('should validate minimum for integer type', () => {
      expect(validateVariableValue('Test', '10', 'integer|min:5').valid).toBe(
        true,
      );
      expect(validateVariableValue('Test', '2', 'integer|min:5').valid).toBe(
        false,
      );
    });
  });

  describe('max rule', () => {
    it('should validate maximum string length', () => {
      expect(validateVariableValue('Test', 'ab', 'string|max:5').valid).toBe(
        true,
      );
      expect(
        validateVariableValue('Test', 'abcdef', 'string|max:5').valid,
      ).toBe(false);
    });

    it('should validate maximum numeric value', () => {
      expect(validateVariableValue('Test', '3', 'numeric|max:5').valid).toBe(
        true,
      );
      expect(validateVariableValue('Test', '10', 'numeric|max:5').valid).toBe(
        false,
      );
    });
  });

  describe('combined rules', () => {
    it('should validate multiple rules', () => {
      const result = validateVariableValue(
        'Port',
        '8080',
        'required|numeric|between:1,65535',
      );
      expect(result.valid).toBe(true);
    });

    it('should collect all errors from multiple failing rules', () => {
      const result = validateVariableValue(
        'Port',
        'abc',
        'required|numeric|between:1,65535',
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle required|string|in combination', () => {
      const result = validateVariableValue(
        'Mode',
        'survival',
        'required|string|in:survival,creative,adventure',
      );
      expect(result.valid).toBe(true);
    });

    it('should fail required|string|in with invalid value', () => {
      const result = validateVariableValue(
        'Mode',
        'hardcore',
        'required|string|in:survival,creative,adventure',
      );
      expect(result.valid).toBe(false);
    });

    it('should handle nullable with other rules for null value', () => {
      const result = validateVariableValue(
        'Optional',
        null,
        'nullable|string|min:3',
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should pass for empty rules string', () => {
      const result = validateVariableValue('Test', 'anything', '');
      expect(result.valid).toBe(true);
    });

    it('should handle whitespace in rules', () => {
      const result = validateVariableValue('Test', '5', 'required | numeric');
      expect(result.valid).toBe(true);
    });

    it('should handle value not required and not nullable when empty', () => {
      const result = validateVariableValue('Test', '', 'string|min:1');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('validateServerVariables', () => {
  const eggVariables = [
    {
      envVariable: 'SERVER_PORT',
      name: 'Server Port',
      rules: 'required|numeric|between:1,65535',
      defaultValue: '25565',
    },
    {
      envVariable: 'SERVER_MEMORY',
      name: 'Server Memory',
      rules: 'required|integer|min:512',
      defaultValue: '1024',
    },
    {
      envVariable: 'GAMEMODE',
      name: 'Game Mode',
      rules: 'required|string|in:survival,creative,adventure,spectator',
      defaultValue: 'survival',
    },
    {
      envVariable: 'MOTD',
      name: 'Server MOTD',
      rules: 'nullable|string|max:59',
      defaultValue: '',
    },
  ];

  it('should pass with all valid variables', () => {
    const result = validateServerVariables(
      {
        SERVER_PORT: '25565',
        SERVER_MEMORY: '2048',
        GAMEMODE: 'creative',
        MOTD: 'Welcome!',
      },
      eggVariables,
    );
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('should use default values for missing variables', () => {
    const result = validateServerVariables({}, eggVariables);
    expect(result.valid).toBe(true);
  });

  it('should report errors for invalid variables', () => {
    const result = validateServerVariables(
      {
        SERVER_PORT: '99999',
        SERVER_MEMORY: '256',
        GAMEMODE: 'hardcore',
        MOTD: 'A'.repeat(60),
      },
      eggVariables,
    );
    expect(result.valid).toBe(false);
    expect(result.errors['SERVER_PORT']).toBeDefined();
    expect(result.errors['SERVER_MEMORY']).toBeDefined();
    expect(result.errors['GAMEMODE']).toBeDefined();
    expect(result.errors['MOTD']).toBeDefined();
  });

  it('should handle nullable variables with empty values', () => {
    const result = validateServerVariables(
      {
        SERVER_PORT: '25565',
        SERVER_MEMORY: '1024',
        GAMEMODE: 'survival',
        MOTD: '',
      },
      eggVariables,
    );
    expect(result.valid).toBe(true);
  });

  it('should handle empty variables list', () => {
    const result = validateServerVariables({ FOO: 'bar' }, []);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });
});
