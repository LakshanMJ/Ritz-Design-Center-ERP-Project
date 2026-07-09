LEFT_OVER_MATERIAL_VERIFIATION_DESCRIPTION = 'left_over_material_verification'
PO_CLUB_MARKER_CREATION_DESCRIPTION = 'club_left_over_and_booking_marker_creation'
COSTING_SPEED_CONSUMPTION_DESCRIPTION = 'costing_speed_consumption_data_enter'

TASK_CHOICES = (
    (LEFT_OVER_MATERIAL_VERIFIATION_DESCRIPTION, 'Left Over Material Verification'),
    (PO_CLUB_MARKER_CREATION_DESCRIPTION, 'Club Leftover and Booking Marker Creation'),
    (COSTING_SPEED_CONSUMPTION_DESCRIPTION, 'Costing Speed Consumption Data Enter'),
)


TASK_FRONTEND_LINKS = {
    COSTING_SPEED_CONSUMPTION_DESCRIPTION: 'costing/cad/speed_consumption?costing=',
}