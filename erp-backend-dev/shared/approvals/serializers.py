from rest_framework.serializers import ModelSerializer
from shared.models import Approval, TaskComment, BaseTask, ActionTask
from shared.serializers import UserSerializer
from rest_framework import serializers
from shared.approvals.constants.task_descriptions import TASK_FRONTEND_LINKS


class TaskCommentSerializer(ModelSerializer):
    comment_user = UserSerializer(many=False)

    class Meta:
        model = TaskComment
        fields = '__all__'


class ApprovalSerializer(ModelSerializer):
    approval_name_display = serializers.CharField(source='get_approval_name_display')
    action_display = serializers.CharField(source='get_action_display')
    assigned_users = UserSerializer(many=True)
    action_user = UserSerializer(many=False)
    taskcomment_set = TaskCommentSerializer(many=True)
    created = serializers.SerializerMethodField()
    approval_entities = serializers.SerializerMethodField()
    
    def get_approval_entities(self, instance):
        approval_name = instance.approval_name
        data = instance.get_task_or_approval_entities(approval_name)
        return data

    def get_created(self, isntance):
        return isntance.created.date() if isntance.created else None

    class Meta:
        model = Approval
        fields = ('id', 'display_number', 'entity', 'approval_name', 'approval_name_display', 
                  'action_date', 'action_user', 'action', 'action_display', 'assigned_users', 'taskcomment_set', 'active', 'created', 'approval_entities')
        

class BaseTaskSerializer(ModelSerializer):
        
    class Meta:
        model = BaseTask
        fields = ('__all__')


class ActionTaskSerializer(ModelSerializer):
    display_number = serializers.CharField()
    approval_name_display = serializers.SerializerMethodField()
    task_state_display = serializers.CharField(source='get_task_state_display')
    task_entities = serializers.SerializerMethodField()
    action_user_id = serializers.IntegerField()
    taskcomment_set = TaskCommentSerializer(many=True)

    def get_task_entities(self, instance):
        return instance.get_task_or_approval_entities(instance.task_name)
    
    def get_approval_name_display(self, instance):
        approval_name = None
        approval = Approval.objects.filter(id=instance.id).first()
        if approval:
            approval_name = approval.get_approval_name_display()
        return approval_name
        
    class Meta:
        model = ActionTask
        fields = ('__all__')