from django.urls import path
from marketing.views import cad_views
urlpatterns = [
    path('po_club/cut_plan/meta/<int:po_club_id>/', cad_views.CutPlanMetaView.as_view(), name='cut_plan-meta-view'),

    path('po_club/marker_cut_plan/save/', cad_views.MarkerCutPlanSaveView.as_view(), name='marker_cut_plan-save-view'),

    path('po_club/material/marker_cut_plan/detail/<int:po_club_id>/<int:material_id>/', cad_views.POClubMaterialMarkerCutPlanDetailView.as_view(), name='po_club-material-marker_cut_plan-detail-view'),

    path('po_club/marker_cut_plan/detail/<int:po_club_id>/', cad_views.POClubMarkerCutPlanDetailView.as_view(), name='po_club-marker_cut_plan-detail-view'),

    path('po_club/marker_cut_plan/update/<int:pk>/', cad_views.POClubMarkerCutPlanUpdateView.as_view(), name='po_club-marker_cut_plan-update-view'),

    path('po_club/marker_cut_plan/delete/<int:pk>/', cad_views.POClubMarkerCutPlanDeleteView.as_view(), name='po_club-marker_cut_plan-delete-view'),

    path('po_club/material/roll_sequence/<int:po_club_id>/<int:material_id>/', cad_views.POClubItemMaterialRollSequenceGenarete.as_view(), name='po_club-item-material-roll_sequence-genarete-view'),

    path('po_club/marker_cut_plan/roll_sequence/selected_roll/<int:marker_cut_plan_id>/', cad_views.POClubMarkerCutPlanRollSequenceSelectedRollDetailView.as_view(), name='po_club-marker_cut_plan-roll_sequence-selected_roll-detail-view'),

    path('po_club/marker_cut_plan/genarete/<int:po_club_id>/<int:material_id>/', cad_views.POClubMarkerCutPlanGenarete.as_view(), name='po_club-marker_cut_plan-genarete-view'),

    path('po_club/marker_cut_plan/roll_sequence/finalized/<int:po_club_id>/<int:material_id>/', cad_views.POClubMarkerCutPlanRollSequenceItemMaterialFinalizedView.as_view(), name='po_club-marker_cut_plan-roll_sequence-item-material-finalized-view'),

    path('po_club/material/roll/list/<int:po_club_id>/<int:material_id>/', cad_views.POClubMaterialRollListView.as_view(), name='po_club-material-roll-list-view'),

    
]