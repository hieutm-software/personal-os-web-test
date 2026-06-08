using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    public class CheckLeaveDto
    {
        public string TitleName { get; set; }
        public int? Status { get; set; }
    }
}
