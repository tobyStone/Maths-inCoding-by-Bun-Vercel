# Google Cloud Storage Video Optimization Guide

## 1. Enable Cloud CDN (Most Important)

### Using Google Cloud Console:
1. Go to Google Cloud Console → Network Services → Cloud CDN
2. Click "Add Origin" 
3. Select "Cloud Storage bucket" as origin type
4. Choose your `maths_incoding` bucket
5. Enable caching with these settings:
   - Cache mode: "Cache static content"
   - Default TTL: 3600 seconds (1 hour)
   - Max TTL: 86400 seconds (24 hours)
   - Client TTL: 3600 seconds

### Using gcloud CLI:
```bash
# Create a backend bucket
gcloud compute backend-buckets create maths-incoding-backend \
    --gcs-bucket-name=maths_incoding

# Create URL map
gcloud compute url-maps create maths-incoding-cdn \
    --default-backend-bucket=maths-incoding-backend

# Create HTTP(S) load balancer
gcloud compute target-https-proxies create maths-incoding-proxy \
    --url-map=maths-incoding-cdn \
    --ssl-certificates=YOUR_SSL_CERT

# Create forwarding rule
gcloud compute forwarding-rules create maths-incoding-rule \
    --global \
    --target-https-proxy=maths-incoding-proxy \
    --ports=443
```

## 2. Set Proper Cache Headers

Set these metadata on your video files:
- `Cache-Control: public, max-age=31536000` (1 year for videos)
- `Content-Type: video/mp4`

## 3. Enable Compression

For your bucket, enable gzip compression:
```bash
gsutil -m setmeta -h "Content-Encoding:gzip" gs://maths_incoding/*.mp4
```

## 4. Use Regional Storage Class

Ensure your bucket uses the appropriate storage class:
```bash
gsutil lifecycle set lifecycle.json gs://maths_incoding
```

Where lifecycle.json contains:
```json
{
  "rule": [
    {
      "action": {"type": "SetStorageClass", "storageClass": "STANDARD"},
      "condition": {"age": 0}
    }
  ]
}
```

## 5. Expected Performance Improvements

- **CDN**: 50-80% faster load times globally
- **Preload metadata**: Reduces initial load by ~90%
- **Proper caching**: Eliminates repeat downloads
- **Compression**: 20-30% smaller file sizes

## 6. Update Video URLs

After enabling CDN, update your video URLs from:
`https://storage.googleapis.com/maths_incoding/video.mp4`

To your CDN endpoint:
`https://your-cdn-domain.com/video.mp4`
