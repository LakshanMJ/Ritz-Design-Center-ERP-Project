from django.conf.urls.static import static
from django.conf import settings
from django.urls import path, include
from django.contrib.auth import views as auth_views
from django.contrib import admin

urlpatterns = [

    path('api/marketing/', include('marketing.urls', namespace='marketing')),
    path('api/shared/', include('shared.urls', namespace='shared')),
    path('api/materials/', include('materials.urls', namespace='materials')),
    path('api/transport/', include('transport.urls', namespace='transport')),
    path('api/supplier_po/', include('supplier_po.urls', namespace='supplier_po')),
    path('api/finance/', include('finance.urls', namespace='finance')),
    path('api/service_po/', include('service_po.urls', namespace='service_po')),
    path('api/warehouse/', include('warehouse.warehouse.urls', namespace='warehouse')),

    path('accounts/login/', auth_views.LoginView.as_view()),
    path('accounts/logout/', auth_views.LogoutView.as_view()),
    path('admin/', admin.site.urls),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


if settings.INCLUDE_DEBUG_TOOLBAR:
    from debug_toolbar.toolbar import debug_toolbar_urls
    urlpatterns += debug_toolbar_urls()