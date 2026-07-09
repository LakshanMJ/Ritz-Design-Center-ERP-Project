from shared.models import Approval,TaskComment, BaseTask, ActionTask
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from shared.permissions.view_permissions import HasPermission
from shared.approvals.constants.approval_choices import APPROVAL_NAME_CHOICES
from shared.permissions.roles import MERCHANT_ROLE, ADMIN_ROLE, ALL_ROLES
from shared.approvals.serializers import ApprovalSerializer, TaskCommentSerializer, ActionTaskSerializer
from shared.models import User
from rest_framework.generics import get_object_or_404
from datetime import datetime
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination
from shared.approvals.constants.approval_choices import APPROVAL_NAME_CHOICES
from shared.approvals.utils import get_approval_search_filtered_qs, get_action_task_search_filtered_qs
from shared.approvals.constants.task_entities import TASK_ENTITY_CHOICES

class ApprovalChoicesListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        approval_choices_list = []
        for choice in APPROVAL_NAME_CHOICES:
            approval_choices_list.append({"id": choice[0], "name": choice[1]})
        return Response(approval_choices_list)
    

class ApprovalStatusListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        approval_choices_list = []
        for choice in Approval.APPROVAL_STATE_CHOICES:
            approval_choices_list.append({"id": choice[0], "name": choice[1]})
        return Response(approval_choices_list)
    

class PendingApprovalUserListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ApprovalSerializer
    queryset = Approval.objects.filter()
    pagination_class = GeneralLargeResultsSetPagination

    ALL_ENTITY_KEY = 'all'

    def get_queryset(self):
        user = self.request.user
        search_text = self.request.GET.get('search_text', None)
        entity = self.request.GET.get('entity', None)
        if user.is_authenticated:
            if entity == self.ALL_ENTITY_KEY:
                qs = Approval.objects.filter(assigned_users=user, action=Approval.PENDING_APPROVAL).order_by('-id')
            else:
                qs = Approval.objects.filter(assigned_users=user, action=Approval.PENDING_APPROVAL, entity__contains=[{"entity_name": entity}]).order_by('id')
            if search_text:
                qs = get_approval_search_filtered_qs(qs, search_text)
        else:
            qs = Approval.objects.none()
        return qs
    

class OtherApprovalUserListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ApprovalSerializer
    queryset = Approval.objects.filter()
    pagination_class = GeneralLargeResultsSetPagination

    ALL_ENTITY_KEY = 'all'

    def get_queryset(self):
        user = self.request.user
        search_text = self.request.GET.get('search_text', None)
        entity = self.request.GET.get('entity', None)
        if user.is_authenticated:
            if entity == self.ALL_ENTITY_KEY:
                qs = Approval.objects.filter(assigned_users=user).exclude(action=Approval.PENDING_APPROVAL).order_by('id')
            else:
                qs = Approval.objects.filter(assigned_users=user, entity__contains=[{"entity_name": entity}]).exclude(action=Approval.PENDING_APPROVAL).order_by('id')
            if search_text:
                qs = get_approval_search_filtered_qs(qs, search_text)
        else:
            qs = Approval.objects.none()
        return qs
    
    
class PendingApprovalAdminListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ApprovalSerializer
    queryset = Approval.objects.filter()
    pagination_class = GeneralLargeResultsSetPagination

    ALL_ENTITY_KEY = 'all'

    def get_queryset(self):
        user = self.request.user
        has_admin_role = user.has_role(ADMIN_ROLE)
        search_text = self.request.GET.get('search_text', None)
        entity = self.request.GET.get('entity', None)
        if user.is_authenticated and has_admin_role:
            if entity == self.ALL_ENTITY_KEY:
                qs = Approval.objects.filter(action=Approval.PENDING_APPROVAL).order_by('id')
            else:
                qs = Approval.objects.filter(action=Approval.PENDING_APPROVAL, entity__contains=[{"entity_name": entity}]).order_by('id')
            if search_text:
                qs = get_approval_search_filtered_qs(qs, search_text)
        else:
            qs = Approval.objects.none()
        return qs
    

class OtherApprovalAdminListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ApprovalSerializer
    queryset = Approval.objects.filter()
    pagination_class = GeneralLargeResultsSetPagination

    ALL_ENTITY_KEY = 'all'

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        has_admin_role = user.has_role(ADMIN_ROLE)
        search_text = self.request.GET.get('search_text', None)
        entity = self.request.GET.get('entity', None)
        if user.is_authenticated and has_admin_role:
            if entity == self.ALL_ENTITY_KEY:
                qs = Approval.objects.filter().exclude(action=Approval.PENDING_APPROVAL).order_by('id')
            else:
                qs = Approval.objects.filter(entity__contains=[{"entity_name": entity}]).exclude(action=Approval.PENDING_APPROVAL).order_by('id')
            if search_text:
                qs = get_approval_search_filtered_qs(qs, search_text)
        else:
            qs = Approval.objects.none()
        return qs
    
    
class ApprovalDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ApprovalSerializer
    queryset = Approval.objects.filter()


class ApprovalStateUpdateView(APIView):
    permission_classes = (HasPermission, )
    write_roles = ALL_ROLES

    def post(self, request, pk):
        from shared.approvals.constants.approval_call_back_function_mappings import ApprovalMappingFuntionData
        approval = get_object_or_404(Approval, pk=pk)
        approval_status = request.data.get('approval_status')
        user = self.request.user

        if user.is_authenticated:
            mapping_function = ApprovalMappingFuntionData.get(approval.approval_name)
            if mapping_function:
                approval.action_user = user
                has_errors, errors = mapping_function(approval, approval_status)
                if not has_errors:
                    approval.action = approval_status
                    approval.action_date = datetime.now()
                    approval.save()
                    http_response = Response({'status': True})
                else:
                    http_response = Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
            else:
                http_response = Response({'errors': 'No mapping funtion found.Please contact System Administrator'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            http_response = Response({'error': 'User not authenticated'}, status=status.HTTP_403_FORBIDDEN)
        return http_response
    

class ApprovalCommentUpdateView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, pk):
        task = get_object_or_404(BaseTask, pk=pk)
        comment = request.data.get('comment')
        user = self.request.user
        if user.is_authenticated:
            task_comment = TaskComment.objects.create(
                task=task,
                comment=comment,
                comment_user=user
            )
            http_response = Response({'status': True})
        else:
            http_response = Response({'error': 'User not authenticated'}, status=status.HTTP_403_FORBIDDEN)
        return http_response
    

class ApprovalCommentDeleteView(generics.RetrieveDestroyAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = TaskCommentSerializer
    queryset = TaskComment.objects.filter()


class ApprovalUpdateView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [ADMIN_ROLE, ]

    def post(self, request, pk):
        approval = get_object_or_404(Approval, pk=pk)
        user = self.request.user
        assign_user_ids = request.data.get('assign_users', [])
        action = request.data.get('action', None) 
        has_admin_role = user.has_role(ADMIN_ROLE)
        if user.is_authenticated and has_admin_role:
            assigned_users = User.objects.filter(pk__in=assign_user_ids)
            approval.assigned_users.set(assigned_users)

            all_assign_users = approval.assigned_users.all()
            users_to_remove = all_assign_users.exclude(pk__in=assign_user_ids)
            approval.assigned_users.remove(*users_to_remove)

            if action:
                approval.action = action
            approval.save()
            http_response = Response({'success': True})
        else:
            http_response = Response({'error': 'User not authenticated'}, status=status.HTTP_403_FORBIDDEN)   
        return http_response
    

class PendingTaskUserListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ActionTaskSerializer
    queryset = ActionTask.objects.filter()
    pagination_class = GeneralLargeResultsSetPagination

    ALL_ENTITY_KEY = 'all'

    def get_queryset(self):
        user = self.request.user
        search_text = self.request.GET.get('search_text', None)
        entity = self.request.GET.get('entity', None)
        if user.is_authenticated:
            if entity == self.ALL_ENTITY_KEY:
                qs = ActionTask.objects.filter(assigned_users=user, task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE]).order_by('id')
            else:
                qs = ActionTask.objects.filter(assigned_users=user, task_state__in=[ActionTask.OPEN_STATE, 
                                                                                    ActionTask.IN_PROGRESS_STATE], 
                                                                                    entity__contains=[{"entity_name": entity}]).order_by('id')
            if search_text:
                qs = get_action_task_search_filtered_qs(qs, search_text)
        else:
            qs = ActionTask.objects.none()
        return qs
    

class OtherTaskUserListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ActionTaskSerializer
    queryset = ActionTask.objects.filter()
    pagination_class = GeneralLargeResultsSetPagination

    ALL_ENTITY_KEY = 'all'

    def get_queryset(self):
        user = self.request.user
        search_text = self.request.GET.get('search_text', None)
        entity = self.request.GET.get('entity', None)
        if user.is_authenticated:
            if entity == self.ALL_ENTITY_KEY:
                qs = ActionTask.objects.filter(assigned_users=user).exclude(task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE]).order_by('id')
            else:
                qs = ActionTask.objects.filter(assigned_users=user, entity__contains=[{"entity_name": entity}]).exclude(task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE]).order_by('id')
            if search_text:
                qs = get_action_task_search_filtered_qs(qs, search_text)
        else:
            qs = ActionTask.objects.none()
        return qs
    

class PendingTaskAdminListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ActionTaskSerializer
    queryset = ActionTask.objects.filter()
    pagination_class = GeneralLargeResultsSetPagination

    ALL_ENTITY_KEY = 'all'

    def get_queryset(self):
        user = self.request.user
        has_admin_role = user.has_role(ADMIN_ROLE)
        search_text = self.request.GET.get('search_text', None)
        entity = self.request.GET.get('entity', None)
        if user.is_authenticated and has_admin_role:
            if entity == self.ALL_ENTITY_KEY:
                qs = ActionTask.objects.filter(task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE]).order_by('id')
            else:
                qs = ActionTask.objects.filter(task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE], entity__contains=[{"entity_name": entity}]).order_by('id')
            if search_text:
                qs = get_action_task_search_filtered_qs(qs, search_text)
        else:
            qs = Approval.objects.none()
        return qs
    

class OtherTaskAdminListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ActionTaskSerializer
    queryset = ActionTask.objects.filter()
    pagination_class = GeneralLargeResultsSetPagination

    ALL_ENTITY_KEY = 'all'

    def get_queryset(self):
        user = self.request.user
        has_admin_role = user.has_role(ADMIN_ROLE)
        search_text = self.request.GET.get('search_text', None)
        entity = self.request.GET.get('entity', None)
        if user.is_authenticated and has_admin_role:
            if entity == self.ALL_ENTITY_KEY:
                qs = ActionTask.objects.filter().exclude(task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE]).order_by('id')
            else:
                qs = ActionTask.objects.filter(entity__contains=[{"entity_name": entity}]).exclude(task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE]).order_by('id')
            if search_text:
                qs = get_action_task_search_filtered_qs(qs, search_text)
        else:
            qs = ActionTask.objects.none()
        return qs
    

class ActionTaskDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ActionTaskSerializer
    queryset = ActionTask.objects.filter()


class ActionTaskChoicesListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        action_task_choice_list = []
        for choice in ActionTask.ACTION_TASK_STATE_CHOICES:
            action_task_choice_list.append({"id": choice[0], "name": choice[1]})
        return Response(action_task_choice_list)
    

class ActionTaskEntityListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        action_task_choice_list = []
        for choice in ActionTask.ACTION_TASK_STATE_CHOICES:
            action_task_choice_list.append({"id": choice[0], "name": choice[1]})
        return Response(action_task_choice_list)
    

class ActionTaskUpdateView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [ADMIN_ROLE, ]

    def post(self, request, pk):
        action_task = get_object_or_404(ActionTask, pk=pk)
        user = self.request.user
        assign_user_ids = request.data.get('assign_users', [])
        action_user = request.data.get('action_user', None) 
        task_state = request.data.get('task_state', None) 
        has_admin_role = user.has_role(ADMIN_ROLE)
        if user.is_authenticated and has_admin_role:
            assigned_users = User.objects.filter(pk__in=assign_user_ids)
            action_task.assigned_users.set(assigned_users)

            all_assign_users = action_task.assigned_users.all()
            users_to_remove = all_assign_users.exclude(pk__in=assign_user_ids)
            action_task.assigned_users.remove(*users_to_remove)

            if task_state:
                action_task.task_state = task_state
            if action_user:
                action_task.action_user_id = action_user
            action_task.save()
            http_response = Response({'success': True})
        else:
            http_response = Response({'error': 'User not authenticated'}, status=status.HTTP_403_FORBIDDEN)
        return http_response
    

class ApprovalTaskEntitiesListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    USER_FILTER_KEY = 'user'
    ADMIN_FILTER_KEY = 'admin'

    PENDING_STATUS_KEY = 'pending'
    OTHER_STATUS_KEY = 'other'

    def get(self, request):
        filter = request.query_params.get('filter', None)
        status = request.query_params.get('status', None)
        user = self.request.user
        task_entity_list = []
        for choice in TASK_ENTITY_CHOICES:
            count = 0
            if filter==self.USER_FILTER_KEY and status==self.PENDING_STATUS_KEY:

                count = Approval.objects.filter(action=Approval.PENDING_APPROVAL, entity__contains=[{"entity_name": choice[0]}], assigned_users=user).count()
            elif filter==self.ADMIN_FILTER_KEY and status==self.PENDING_STATUS_KEY:
                count = Approval.objects.filter(action=Approval.PENDING_APPROVAL, entity__contains=[{"entity_name": choice[0]}]).count()
            if filter==self.USER_FILTER_KEY and status==self.OTHER_STATUS_KEY:
                count = Approval.objects.filter(assigned_users=user, entity__contains=[{"entity_name": choice[0]}]).exclude(action=Approval.PENDING_APPROVAL).count()
            elif filter==self.ADMIN_FILTER_KEY and status==self.OTHER_STATUS_KEY:
                count = Approval.objects.filter(entity__contains=[{"entity_name": choice[0]}]).exclude(action=Approval.PENDING_APPROVAL).count()
            task_entity_list.append({"id": choice[0], "name": choice[1], "count": count})
        return Response(task_entity_list)
    

class ActionTaskEntitiesListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    USER_FILTER_KEY = 'user'
    ADMIN_FILTER_KEY = 'admin'

    PENDING_STATUS_KEY = 'pending'
    OTHER_STATUS_KEY = 'other'

    def get(self, request):
        filter = request.query_params.get('filter', None)
        status = request.query_params.get('status', None)
        user = self.request.user
        task_entity_list = []
        for choice in TASK_ENTITY_CHOICES:
            count = 0
            if filter==self.USER_FILTER_KEY and status==self.PENDING_STATUS_KEY:
                count = ActionTask.objects.filter(task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE], entity__contains=[{"entity_name": choice[0]}], assigned_users=user).count()
            elif filter==self.ADMIN_FILTER_KEY and status==self.PENDING_STATUS_KEY:
                count = ActionTask.objects.filter(task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE], entity__contains=[{"entity_name": choice[0]}]).count()
            if filter==self.USER_FILTER_KEY and status==self.OTHER_STATUS_KEY:
                count = ActionTask.objects.filter(assigned_users=user, entity__contains=[{"entity_name": choice[0]}]).exclude(task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE]).count()
            elif filter==self.ADMIN_FILTER_KEY and status==self.OTHER_STATUS_KEY:
                count = ActionTask.objects.filter(entity__contains=[{"entity_name": choice[0]}]).exclude(task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE]).count()
            task_entity_list.append({"id": choice[0], "name": choice[1], "count": count})
        return Response(task_entity_list)
    

class CalendarListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        from datetime import datetime, timedelta
        date = request.query_params.get('date', None)
        current_date = datetime.strptime(date, "%Y-%m-%d").date()
        start_of_month = current_date.replace(day=1)
        today = datetime.today().date()
        data = []
        while start_of_month <= today:
            approval_count = Approval.objects.filter(created__date=start_of_month, assigned_users__in=[request.user]).count()
            task_count = ActionTask.objects.filter(created__date=start_of_month, assigned_users__in=[request.user]).count()
            date_str =  start_of_month.strftime("%Y-%m-%d")
            if approval_count > 0 or task_count > 0:
                date_data = {
                    'date':date_str,
                    'approval_count': approval_count,
                    'task_count': task_count,
                    'total': approval_count + task_count
                }
                data.append(date_data)
            start_of_month += timedelta(days=1)
        return Response(data)
    

class CalendarDetailView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        from datetime import datetime, timedelta
        date = request.query_params.get('date', None)
        current_date = datetime.strptime(date, "%Y-%m-%d").date()
        data = {
            'approvals': [],
            'tasks': []
        }
        approvals = Approval.objects.filter(created__date=current_date, assigned_users__in=[request.user])
        tasks = ActionTask.objects.filter(created__date=current_date, assigned_users__in=[request.user])

        for approval in approvals:
            data['approvals'].append({
                'id': approval.id,
                'display_number': approval.display_number,
                'description': approval.description,
                'status': approval.get_action_display()
            })

        for task in tasks:
            data['tasks'].append({
                'id': task.id,
                'display_number': task.display_number,
                'description': task.description,
                'status': task.get_task_state_display()
            })

        return Response(data)

