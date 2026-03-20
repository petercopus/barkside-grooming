import { updateEmployee } from '~~/server/services/employee.service';
import { updateEmployeeSchema } from '~~/shared/schemas/employee';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:manage');

  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  const input = updateEmployeeSchema.parse(body);
  const employee = await updateEmployee(id!, input);

  return { employee };
});
