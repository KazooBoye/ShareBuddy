# Gotenberg Service Configuration

## Overview
Gotenberg is used for converting Microsoft Office documents (DOCX, PPTX, XLSX) to PDF format for preview generation.

## Docker Configuration

### Service Details
- **Image**: `gotenberg/gotenberg:8`
- **Internal Port**: 3000
- **External Port**: 3001 (for direct access/testing)
- **Network**: `sharebuddy-network`

### Resource Limits
- **CPU**: 2 cores max
- **Memory**: 2GB max, 512MB reserved
- **Reason**: LibreOffice conversion is CPU and memory intensive

### Environment Variables
Backend service uses:
```bash
GOTENBERG_URL=http://gotenberg:3000
```

### Command Arguments
```yaml
command:
  - "gotenberg"
  - "--api-timeout=120s"              # Allow up to 120s for conversion
  - "--libreoffice-auto-start=true"   # Auto-start LibreOffice
  - "--libreoffice-restart-after=10"  # Restart LibreOffice after 10 conversions
```

## Supported File Types
The following file types are converted via Gotenberg:
- `.docx` - Microsoft Word documents
- `.doc` - Legacy Word documents
- `.pptx` - PowerPoint presentations
- `.ppt` - Legacy PowerPoint
- `.xlsx` - Excel spreadsheets
- `.xls` - Legacy Excel

## Health Check
- **Endpoint**: `http://gotenberg:3000/`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

## Backend Integration

### Code Location
`backend/src/controllers/previewController.js`

### Conversion Process
1. Upload document to backend
2. Backend checks file type
3. If Office format → sends to Gotenberg via HTTP POST to `/forms/libreoffice/convert`
4. Gotenberg converts to PDF and returns buffer
5. Backend generates preview (first 10 pages)
6. Preview stored in `uploads/previews/`

### Example Request
```javascript
const formData = new FormData();
formData.append('files', fsSync.createReadStream(filePath));

const response = await axios.post(
  `${GOTENBERG_URL}/forms/libreoffice/convert`, 
  formData, 
  {
    responseType: 'arraybuffer',
    headers: { ...formData.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  }
);
```

## Testing

### 1. Check if Gotenberg is running
```bash
docker ps | grep gotenberg
```

### 2. Test health endpoint
```bash
curl http://localhost:3001/
```

### 3. Test conversion (requires a .docx file)
```bash
curl --request POST \
  --url http://localhost:3001/forms/libreoffice/convert \
  --header 'Content-Type: multipart/form-data' \
  --form files=@test.docx \
  --output result.pdf
```

## Deployment Checklist

### Before Deploy
- [ ] Ensure `.env` file has `GOTENBERG_URL=http://gotenberg:3000`
- [ ] Verify backend Dockerfile includes necessary dependencies
- [ ] Check that `uploads/previews/` directory is created
- [ ] Test with sample Office documents

### During Deploy
```bash
# Pull latest Gotenberg image
docker pull gotenberg/gotenberg:8

# Start services (Gotenberg will start before backend due to depends_on)
docker-compose up -d

# Check Gotenberg logs
docker logs sharebuddy-gotenberg

# Verify backend can connect
docker logs sharebuddy-backend | grep -i gotenberg
```

### After Deploy
- [ ] Upload a DOCX file and verify preview generation works
- [ ] Check Gotenberg memory usage: `docker stats sharebuddy-gotenberg`
- [ ] Monitor conversion errors in backend logs

## Troubleshooting

### Gotenberg not starting
```bash
# Check logs
docker logs sharebuddy-gotenberg

# Common issues:
# - Not enough memory allocated
# - Port 3001 already in use
# - Health check failing
```

### Conversion timeout
- Increase `--api-timeout` value in docker-compose.yml
- Increase resource limits (CPU/Memory)
- Check file size isn't too large

### Out of memory
```bash
# Increase memory limit in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 4G  # Increase if needed
```

### LibreOffice crashes
- Gotenberg will auto-restart LibreOffice after 10 conversions
- If crashes persist, reduce `--libreoffice-restart-after` value

## Performance Optimization

### For Production
1. **Increase resources** if handling many concurrent conversions
2. **Monitor memory usage** and adjust limits accordingly
3. **Set up horizontal scaling** if needed (multiple Gotenberg instances)
4. **Implement caching** for frequently converted documents
5. **Add timeout limits** on backend side to prevent hanging requests

### Recommended Production Settings
```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
    reservations:
      memory: 1G
  replicas: 2  # For load balancing
```

## Security Notes
- Gotenberg service is on internal Docker network only
- Port 3001 exposed for testing - **remove in production** or restrict access
- No authentication required for internal service calls
- Input validation should be done in backend before sending to Gotenberg

## References
- [Gotenberg Documentation](https://gotenberg.dev/)
- [API Reference](https://gotenberg.dev/docs/routes)
- [Docker Hub](https://hub.docker.com/r/gotenberg/gotenberg)
