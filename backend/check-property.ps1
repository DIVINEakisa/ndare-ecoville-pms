$r   = Invoke-RestMethod -Method POST -Uri 'https://ndare-ecoville-pms.onrender.com/api/auth/login' -ContentType 'application/json' -Body '{"email":"owner@ndareecoville.rw","password":"ChangeMe123!"}'
$tok = $r.data.accessToken
$h   = @{ Authorization = "Bearer $tok" }
$props = (Invoke-RestMethod -Uri 'https://ndare-ecoville-pms.onrender.com/api/properties' -Headers $h).data
foreach ($p in $props) {
    Write-Host "Property: $($p.name) | ID: $($p._id) | Code: $($p.code)"
}
