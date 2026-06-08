using Abp.Runtime.Validation;
using ERP.Dto;
using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    public class FilterLeaveApplicationDto : PagedAndSortedInputDto, IShouldNormalize
    {
        public string Filter { get; set; }
        public long? LeaveApplicationTypeId { get; set; }
        public string DepartmentId { get; set; }
        public int Status { get; set; }
        public int? UserId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public bool? IsMobile { get; set; }
        public void Normalize()
        {
            if (string.IsNullOrEmpty(Sorting))
            {
                Sorting = "STT desc, creationTime desc";
            }
            Filter = Filter?.Trim();
        }
    }
}
