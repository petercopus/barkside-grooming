import { getEmployee } from '~~/server/services/employee.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:manage');

  const id = getRouterParam(event, 'id');
  const employee = await getEmployee(id!);

  return { employee };
});
