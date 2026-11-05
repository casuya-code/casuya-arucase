content = open('frontend/src/pages/reports/IndividualReportDetail.jsx').read()
marker = "                  {isForm5Or6"
idx = content.find(marker)
end_marker = "                </td>"
end_idx = content.find(end_marker, idx)
new_block = "PLACEHOLDER"
content = content[:idx] + new_block + content[end_idx+14:]
open('frontend/src/pages/reports/IndividualReportDetail.jsx', 'w').write(content)
print("done")