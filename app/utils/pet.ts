/**
 * Display labels for pet-related enums.
 * Use these instead of rendering raw enum strings (`male`, `xlarge`, ...).
 */
export const genderLabel: Record<string, string> = {
  male: 'Male',
  female: 'Female',
};

export const sizeCategoryLabel: Record<string, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xlarge: 'Extra Large',
};

export const coatTypeLabel: Record<string, string> = {
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
  curly: 'Curly',
};

export const activeStatusLabel: Record<string, string> = {
  true: 'Active',
  false: 'Inactive',
};
