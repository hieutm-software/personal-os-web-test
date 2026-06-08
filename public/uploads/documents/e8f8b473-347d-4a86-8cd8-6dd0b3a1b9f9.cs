using Abp.Runtime.Validation;
using ERP.Dto;
using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    public class FilterLeaveApprovalAuthorizationDto : PagedAndSortedInputDto, IShouldNormalize
    {
        public string Filter { get; set; }
        public void Normalize()
        {
            if (string.IsNullOrEmpty(Sorting))
            {
                Sorting = "ValideFromDate";
            }

            Filter = Filter?.Trim();
        }
    }
}
