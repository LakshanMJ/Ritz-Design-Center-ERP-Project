from django.urls import path
from shared.approvals import views as approval_views

app_name = 'approval'

urlpatterns = [

    path('choices/', approval_views.ApprovalChoicesListView.as_view(), name='approvals-choices-list-view'),

    path('status/list/', approval_views.ApprovalStatusListView.as_view(), name='approval-status-list-view'),

    path('detail/<int:pk>/', approval_views.ApprovalDetailView.as_view(), name='approval-detail-view'),

    path('user/pending/list/', approval_views.PendingApprovalUserListView.as_view(), name='pending-approvals-user-list-view'),

    path('user/other/list/', approval_views.OtherApprovalUserListView.as_view(), name='other-approvals-user-list-view'),

    path('admin/pending/list/', approval_views.PendingApprovalAdminListView.as_view(), name='pending-approvals-admin-list-view'),

    path('admin/other/list/', approval_views.OtherApprovalAdminListView.as_view(), name='other-approvals-admin-list-view'),

    path('update_state/<int:pk>/', approval_views.ApprovalStateUpdateView.as_view(), name='approvals-state-update-view'),

    path('update_comment/<int:pk>/', approval_views.ApprovalCommentUpdateView.as_view(), name='approvals-comment-update-view'),

    path('comment/delete/<int:pk>/', approval_views.ApprovalCommentDeleteView.as_view(), name='approvals-comment-delete-view'),

    path('admin/update/<int:pk>/', approval_views.ApprovalUpdateView.as_view(), name='approval-update-view'),

    path('task/choices/', approval_views.ActionTaskChoicesListView.as_view(), name='action-task-choices-list-view'),

    path('user/task/pending/list/', approval_views.PendingTaskUserListView.as_view(), name='user-pending-task-user-list-view'),

    path('user/task/other/list/', approval_views.OtherTaskUserListView.as_view(), name='user-other-task-user-list-view'),

    path('admin/task/pending/list/', approval_views.PendingTaskAdminListView.as_view(), name='admin-pending-task-user-list-view'),

    path('admin/task/other/list/', approval_views.OtherTaskAdminListView.as_view(), name='admin-other-task-user-list-view'),

    path('task/detail/<int:pk>/', approval_views.ActionTaskDetailView.as_view(), name='task-detail-view'),

    path('task/admin/update/<int:pk>/', approval_views.ActionTaskUpdateView.as_view(), name='task-update-view'),

    path('task_entity/list/', approval_views.ApprovalTaskEntitiesListView.as_view(), name='approval-task-entities-list-view'),

    path('action_task/task_entity/list/', approval_views.ActionTaskEntitiesListView.as_view(), name='action-task-entites-list-view'),

    path('calendar/', approval_views.CalendarListView.as_view(), name='action-task-entites-list-view'),

    path('calendar/detail/', approval_views.CalendarDetailView.as_view(), name='action-task-entites-list-view'),

]