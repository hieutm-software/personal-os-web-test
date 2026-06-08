using Abp.Application.Services.Dto;
using Abp.AutoMapper;
using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    [AutoMapTo(typeof(Models.Business.EmployeeAnnualLeave))]
    public class EmployeeAnnualLeaveDto : EntityDto<long>
    {
        public long? EmployeeId { get; set; }
        public decimal NumberOfAnnualLeave { get; set; }
        public decimal DaysUsed { get; set; }
        public decimal DaysLeft { get; set; }
        public decimal AnnualLeaveLastYear { get; set; }
        public DateTime? CreationTime { get; set; }
        public DateTime? LastModificationTime { get; set; }
        // Test
        public decimal AnnualLeaveThisYearUsed { get; set; }
    }
}
