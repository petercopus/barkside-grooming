import appointmentsByStatus from './appointments-by-status';
import groomerUtilization from './groomer-utilization';
import revenueByPeriod from './revenue-by-period';
import topServices from './top-services';

export const allReportDefinitions = [
  revenueByPeriod,
  appointmentsByStatus,
  topServices,
  groomerUtilization,
];
