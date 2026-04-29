interface PetServiceLine {
  priceAtBookingCents: number;
}
interface PetBundleLine {
  discountAppliedCents: number;
}
interface AppointmentPetLike {
  services?: PetServiceLine[];
  addons?: PetServiceLine[];
  bundles?: PetBundleLine[];
}
interface AppointmentLike {
  pets?: AppointmentPetLike[];
}

export function petSubtotalCents(pet: AppointmentPetLike): number {
  const services = pet.services?.reduce((sum, s) => sum + s.priceAtBookingCents, 0) ?? 0;
  const addons = pet.addons?.reduce((sum, a) => sum + a.priceAtBookingCents, 0) ?? 0;
  const discount = pet.bundles?.reduce((sum, b) => sum + b.discountAppliedCents, 0) ?? 0;
  return services + addons - discount;
}

export function appointmentSubtotalCents(appointment: AppointmentLike): number {
  return (appointment.pets ?? []).reduce((sum, pet) => sum + petSubtotalCents(pet), 0);
}
