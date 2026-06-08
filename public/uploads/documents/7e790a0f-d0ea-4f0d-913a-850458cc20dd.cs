using Abp.Application.Services.Dto;
using Abp.AutoMapper;
using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    [AutoMapTo(typeof(Models.Business.EmployeeAnnualLeave))]
    public class UpdateAnnualThisYearUsedDto : EntityDto<long>
    {
        public decimal AnnualLeaveThisYearUsed { get; set; }
    }
}