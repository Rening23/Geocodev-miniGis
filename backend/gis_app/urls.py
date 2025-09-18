from django.urls import path
from .views import upload_file, operations_shapefile, ping
urlpatterns = [
    path('ping/', ping, name='ping'),
    path('upload/', upload_file, name='upload_file'),
    path('operations_shapefile/', operations_shapefile, name='operations_shapefile'),
]
