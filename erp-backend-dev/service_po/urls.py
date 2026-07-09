from django.urls import path, include

app_name = 'service_po'

urlpatterns = [
    path('spo/', include('service_po.service_po.urls', namespace='service_po_urls')),
]
