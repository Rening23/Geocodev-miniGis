import os, uuid, io, json, zipfile, tempfile
from django.http import JsonResponse
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt

import geopandas as gpd
import pyogrio

@csrf_exempt
def ping(request):
    return JsonResponse({'status':'ok'})

@csrf_exempt
def upload_file(request):
    if request.method != 'POST' or 'shapefile' not in request.FILES:
        return JsonResponse({'detail':'Método no permitido o archivo no enviado'}, status=400)
    try:
        uploaded = request.FILES['shapefile']
        with tempfile.TemporaryDirectory() as tmpdir:
            zpath = os.path.join(tmpdir, uploaded.name)
            with open(zpath, 'wb') as f:
                for chunk in uploaded.chunks():
                    f.write(chunk)
            with zipfile.ZipFile(zpath,'r') as z:
                z.extractall(tmpdir)

            shp = next((os.path.join(tmpdir, fn) for fn in os.listdir(tmpdir) if fn.lower().endswith('.shp')), None)
            if not shp:
                return JsonResponse({'detail':'No se encontró .shp en el ZIP'}, status=400)

            gdf = gpd.read_file(shp, engine='pyogrio')
            if gdf.empty:
                return JsonResponse({'detail':'El shapefile está vacío'}, status=400)
            if gdf.crs is None:
                return JsonResponse({'detail':'El shapefile no tiene CRS definido (.prj faltante)'}, status=400)

            if gdf.crs.to_epsg() != 4326:
                gdf = gdf.to_crs(4326)

            data = json.loads(gdf.to_json())
            return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'detail': str(e)}, status=500)

@csrf_exempt
def operations_shapefile(request):
    if request.method != 'POST' or 'shapefile' not in request.FILES:
        return JsonResponse({'detail':'Método no permitido o archivo no enviado'}, status=400)
    try:
        buffer_distance = float(request.POST.get('buffer_distance', 100))

        with tempfile.TemporaryDirectory() as tmpdir:
            zpath = os.path.join(tmpdir, request.FILES['shapefile'].name)
            with open(zpath, 'wb') as f:
                for chunk in request.FILES['shapefile'].chunks():
                    f.write(chunk)
            with zipfile.ZipFile(zpath,'r') as z:
                z.extractall(tmpdir)

            shp = next((os.path.join(tmpdir, fn) for fn in os.listdir(tmpdir) if fn.lower().endswith('.shp')), None)
            if not shp:
                return JsonResponse({'detail':'No se encontró .shp en el ZIP'}, status=400)

            gdf = gpd.read_file(shp, engine='pyogrio')
            if gdf.crs is None:
                return JsonResponse({'detail':'Shapefile sin CRS (.prj faltante)'}, status=400)

            gdfm = gdf.to_crs(3857)
            gdf_buff = gdf.copy()
            gdf_buff['geometry'] = gdfm.buffer(buffer_distance)
            gdf_buff = gdf_buff.to_crs(4326)

            # Guardar
            uid = uuid.uuid4().hex
            out_dir = os.path.join(settings.MEDIA_ROOT, 'shapefiles', uid)
            os.makedirs(out_dir, exist_ok=True)
            out_shp = os.path.join(out_dir, f'{uid}.shp')

            pyogrio.write_dataframe(gdf_buff, out_shp, driver="ESRI Shapefile")

            zip_name = f'{uid}.zip'
            zip_path_out = os.path.join(settings.MEDIA_ROOT, 'shapefiles', zip_name)
            with zipfile.ZipFile(zip_path_out, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for ext in ('shp','shx','dbf','prj','cpg'):
                    fpath = os.path.join(out_dir, f'{uid}.{ext}')
                    if os.path.exists(fpath):
                        zipf.write(fpath, arcname=os.path.basename(fpath))

            data = json.loads(gdf_buff.to_json())
            return JsonResponse({'geojson': data, 'buffer_distance': buffer_distance, 'shapefile_uid': uid}, safe=False)
    except Exception as e:
        return JsonResponse({'detail': str(e)}, status=500)
