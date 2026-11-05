content = open('frontend/src/pages/reports/IndividualReportDetail.jsx').read()
old = "PLACEHOLDER"
new = '{isForm5Or6 ? ((term === "Term I" || term === "First Term" || term === "Term 1") ? "DISEMBA" : "JUNI") : ((term === "Term I" || term === "First Term" || term === "Term 1") ? "JUNI" : "DISEMBA")}'
assert old in content, "placeholder not found"
content = content.replace(old, new)
open('frontend/src/pages/reports/IndividualReportDetail.jsx', 'w').write(content)
print("done")