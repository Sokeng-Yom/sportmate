import type {
  CourtRead,
  VenueDiscountRead,
  VenueEventRead,
  VenueRead,
} from "../../lib/types";

export type Discount = VenueDiscountRead;
export type VenueEvent = VenueEventRead;
export type PublicVenue = VenueRead & {
  courts: CourtRead[];
  discounts: VenueDiscountRead[];
  events: VenueEventRead[];
};
