
import { createdGrnDetailsPageURL } from "../constants/front_end/GrnUrls";
import { leftoverVerificationDetailPageUrl } from "../constants/front_end/LeftoverUrls";
import { purchaseOrderClubDetailsPageURL, purchaseOrderDetailsPageURL } from "../constants/front_end/POUrls";
import { GRN_ENTITY, IN_HOUSE_MATERIAL_VERIFIATION_ENTITY, PO_CLUB_ENTITY, PURCHASE_ORDER_ENTITY } from "./EntityTypes";

export function entityURL(entity: any, entityType: any) {
  switch (entityType) {
    case PO_CLUB_ENTITY:
      return purchaseOrderClubDetailsPageURL(entity);
      
    case GRN_ENTITY:
      return createdGrnDetailsPageURL(entity);
      
    case PURCHASE_ORDER_ENTITY:
      return purchaseOrderDetailsPageURL(entity);
      
    case IN_HOUSE_MATERIAL_VERIFIATION_ENTITY:
      return leftoverVerificationDetailPageUrl(entity);
      
    default:
      return '#';
  }
}