from django.apps import apps
from shared.models import Approval, ActionTask
from shared.approvals.constants.task_entity_mappings import TASK_ENTITY_MODEL_MAPPING
from shared.approvals.constants.task_entities import TASK_ENTITY_CHOICES
from shared.utils import get_object_or_none
from shared.approvals.constants.approval_choices import APPROVAL_NAME_CHOICES, APPROVAL_FRONTEND_LINKS
from shared.approvals.constants.task_descriptions import TASK_FRONTEND_LINKS
from django.db.models import Q
from datetime import datetime
from supplier_po.models import SupplierPOGRN


def get_matching_keys_from_choises(choices, search_text):
    matching_keys = [
    value for value, display in choices if search_text.lower() in display.lower()
    ]
    return matching_keys

def convert_to_int(search_text):
    try:
        return int(search_text)
    except ValueError:
        return None
    
def get_task_entitiy_key_display_value(entity_key):
    for key, display_value in TASK_ENTITY_CHOICES:
        if key == entity_key:
            return display_value
    return None
    
def get_approval_search_filtered_qs(qs, search_text):
    filtered_qs = qs.filter(
        Q(approval_name__icontains=search_text) | 
        Q(approval_name__in=get_matching_keys_from_choises(APPROVAL_NAME_CHOICES, search_text)) | 
        Q(action_user__first_name__icontains=search_text) | 
        Q(action_user__last_name__icontains=search_text) |
        Q(action__icontains=search_text) |
        Q(assigned_users__first_name__icontains=search_text) |
        Q(assigned_users__last_name__icontains=search_text) |
        Q(id=convert_to_int(search_text))
    ).distinct().order_by('id')
    return filtered_qs

def get_action_task_search_filtered_qs(qs, search_text):
    filtered_qs = qs.filter(
        Q(action_user__first_name__icontains=search_text) | 
        Q(action_user__last_name__icontains=search_text) |
        Q(task_state__icontains=search_text) |
        Q(assigned_users__first_name__icontains=search_text) |
        Q(assigned_users__last_name__icontains=search_text) |
        Q(id=convert_to_int(search_text))
    ).distinct().order_by('id')
    return filtered_qs

class ApprovalUtils:

    def __init__(self, base_task):
        self.base_task = base_task

    @staticmethod
    def assign_approval(approval_users, action_user, entity, approval_name, description, approval_status=Approval.PENDING_APPROVAL):
        approval, craeted = Approval.objects.get_or_create(
            entity=entity,
            approval_name=approval_name,
            action=approval_status,
            description=description
        )
        approval.action_user = action_user
        approval.save()
        approval.assigned_users.set(approval_users)
        return approval

    @staticmethod
    def assign_action_task(approval_users, entity, task_name, description, task_state=ActionTask.OPEN_STATE):
        action_task, created = ActionTask.objects.get_or_create(
            entity=entity,
            task_name=task_name,
            description=description
        )
        action_task.task_state = task_state
        action_task.save()
        action_task.assigned_users.set(approval_users)

    def get_task_entity_mapping_model(self, entity_name):
        print(entity_name)
        return TASK_ENTITY_MODEL_MAPPING.get(entity_name)
    
    def get_instance(self, mapping_model, entity_id):
        app_label, model_name = mapping_model.split('.models.')
        model = apps.get_model(app_label, model_name)
        instance = get_object_or_none(model, {'pk': entity_id})
        return instance, model_name
    
    def get_task_frontend_link(self, task_name):
        return TASK_FRONTEND_LINKS.get(task_name, None)
    
    def get_approval_frontend_link(self, entity, approval_name):
        from shared.approvals.constants.approval_choices import get_approval_frontend_links
        link = get_approval_frontend_links(entity, approval_name)
        return link
    
    def get_task_or_approval_entities(self, task_name):
        data = []
        frontend_link = None
        entity = self.base_task.entity
        for row in entity:
            entity_id = row['entity_id']
            entity_name = row['entity_name']
            mapping_model = self.get_task_entity_mapping_model(entity_name)
            if mapping_model:
                instance, model_name = self.get_instance(mapping_model, entity_id)
                if instance:
                    if isinstance(self.base_task, ActionTask):
                        frontend_link = self.get_task_frontend_link(task_name)
                    elif isinstance(self.base_task, Approval):
                        frontend_link = self.get_approval_frontend_link(row, task_name)
                    else:
                        frontend_link = None
                    if isinstance(instance, SupplierPOGRN):
                        display_number = getattr(instance, 'grn_number')
                    else:
                        display_number = getattr(instance, 'display_number')
                    instance_data = {
                        'entity_id': entity_id,
                        'entity_name': entity_name,
                        'display_number': display_number,
                        'model_name': model_name,
                        'task_frontend_link': frontend_link
                    }
                    data.append(instance_data)
        return data
    
