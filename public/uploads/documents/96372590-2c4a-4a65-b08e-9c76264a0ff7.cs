using Abp.Application.Services.Dto;
using Abp.AutoMapper;
using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    [AutoMapTo(typeof(Models.Business.LeaveApplication))]
    public class UpdateAnnualLeaveApplicationDto : EntityDto<long>
    {
        public decimal AnnualLeaveWhenCreate { get; set; }

    }
}