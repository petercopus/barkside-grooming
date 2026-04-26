import type { CalendarDate } from '@internationalized/date';

const STORAGE_KEY = 'barkside:booking:v1';

let _hydrated = false;
let _watcherInstalled = false;

type SlotSelection = { scheduledDate: string; groomerId: string; startTime: string };
type BundleSelection = { bundleId: number; discountCents: number };

type RuntimeState = {
  step: number;
  notes: string;
  /* Auth flow */
  selectedPetIds: string[];
  petBaseServices: Record<string, number[]>;
  petAddons: Record<string, number[]>;
  petBundles: Record<string, BundleSelection | null>;
  petSlots: Record<string, SlotSelection>;
  petDates: Record<string, CalendarDate | undefined>;
  /* Guest flow */
  guestPet: { name: string; breed: string; weightLbs: number | undefined };
  guestContact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  };
  guestBaseServices: number[];
  guestAddons: number[];
  guestBundle: BundleSelection | null;
  guestSlot: SlotSelection | null;
  guestDate: CalendarDate | undefined;
};

function defaultState(): RuntimeState {
  return {
    step: 0,
    notes: '',
    selectedPetIds: [],
    petBaseServices: {},
    petAddons: {},
    petBundles: {},
    petSlots: {},
    petDates: {},
    guestPet: { name: '', breed: '', weightLbs: undefined },
    guestContact: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    },
    guestBaseServices: [],
    guestAddons: [],
    guestBundle: null,
    guestSlot: null,
    guestDate: undefined,
  };
}

function loadFromStorage(): Partial<RuntimeState> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (parsed.petDates && typeof parsed.petDates === 'object') {
      parsed.petDates = Object.fromEntries(
        Object.entries(parsed.petDates as Record<string, string | undefined>).map(([k, v]) => [
          k,
          parseCalendarDate(v),
        ]),
      );
    }
    if (parsed.guestDate) {
      parsed.guestDate = parseCalendarDate(parsed.guestDate as string);
    }
    return parsed as Partial<RuntimeState>;
  } catch {
    return null;
  }
}

function serializeForStorage(state: RuntimeState) {
  return {
    ...state,
    petDates: Object.fromEntries(
      Object.entries(state.petDates).map(([k, v]) => [k, v ? calendarDateToString(v) : undefined]),
    ),
    guestDate: state.guestDate ? calendarDateToString(state.guestDate) : undefined,
  };
}

export function useBookingState() {
  const state = useState<RuntimeState>('booking-state', () => defaultState());

  // Hydration runs in onMounted to avoid a hydration mismatch.
  // Server has no sessionStorage so it always renders with defaults.
  // Updating state during setup on the client would diverge from the server rendered DOM.
  if (import.meta.client && !_hydrated) {
    _hydrated = true;
    onMounted(() => {
      const loaded = loadFromStorage();
      if (loaded) state.value = { ...state.value, ...loaded };
    });
  }

  if (import.meta.client && !_watcherInstalled) {
    _watcherInstalled = true;
    const scope = effectScope(true);
    scope.run(() => {
      watch(
        state,
        (val) => {
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializeForStorage(val)));
          } catch {}
        },
        { deep: true },
      );
    });
  }

  function field<K extends keyof RuntimeState>(key: K) {
    return computed<RuntimeState[K]>({
      get: () => state.value[key],
      set: (v) => {
        state.value[key] = v;
      },
    });
  }

  function clear() {
    state.value = defaultState();
    if (import.meta.client) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }

  return {
    step: field('step'),
    notes: field('notes'),
    /* Auth flow */
    selectedPetIds: field('selectedPetIds'),
    petBaseServices: field('petBaseServices'),
    petAddons: field('petAddons'),
    petBundles: field('petBundles'),
    petSlots: field('petSlots'),
    petDates: field('petDates'),
    /* Guest flow */
    guestPet: field('guestPet'),
    guestContact: field('guestContact'),
    guestBaseServices: field('guestBaseServices'),
    guestAddons: field('guestAddons'),
    guestBundle: field('guestBundle'),
    guestSlot: field('guestSlot'),
    guestDate: field('guestDate'),
    clear,
  };
}
