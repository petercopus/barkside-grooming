import { setEmployeeServices } from '~~/server/services/employee.service';
import { setEmployeeServicesSchema } from '~~/shared/schemas/employee';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:manage');

  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  const input = setEmployeeServicesSchema.parse(body);
  const serviceIds = await setEmployeeServices(id!, input.serviceIds);

  return { serviceIds };
});
