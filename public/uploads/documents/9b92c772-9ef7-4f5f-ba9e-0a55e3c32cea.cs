using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    public class FilterLeaveAppicationReports
    {
        public long? LeaveApplicationTypeId { get; set; }
        public string DepartmentId { get; set; }
        public int Status { get; set; }
        public int? UserId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }
}
