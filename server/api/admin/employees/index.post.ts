import { createEmployee } from '~~/server/services/employee.service';
import { createEmployeeSchema } from '~~/shared/schemas/employee';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:manage');

  const body = await readBody(event);
  const input = createEmployeeSchema.parse(body);
  const employee = await createEmployee(input);

  return { employee };
});
