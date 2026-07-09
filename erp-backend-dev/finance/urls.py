from django.urls import path, include

app_name = 'supplier_po'

urlpatterns = [
    
    path('payments/', include('finance.payments.urls', namespace='finance')),

]
