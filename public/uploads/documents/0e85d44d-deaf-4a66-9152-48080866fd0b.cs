using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    public class LeaveApplicationReportDto
    {
        public string DepartmentName { get; set; }
        public string Description { get; set; }
        public int? ApprovedApplications { get; set; }
        public int? TotalApplication { get; set; }
        public int? DeclinedApplications { get; set; }
        public int? NotApprovedApplication { get; set; }
        public int? Other1 { get; set; }
        public int? Other2 { get; set; }
        public int? Other3 { get; set; }
        public int? Other4 { get; set; }
        public int? Other5 { get; set; }
        public int? Other6 { get; set; }
    }
}
