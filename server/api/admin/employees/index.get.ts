import { listEmployees } from '~~/server/services/employee.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:manage');

  const employees = await listEmployees();
  return { employees };
});
