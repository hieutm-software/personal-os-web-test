using Abp.Application.Services.Dto;
using Abp.AutoMapper;
using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    [AutoMapTo(typeof(Models.Business.LeaveApplication))]
    public class CreateHalfLeaveApplicationDto : EntityDto<long>
    {
        public int? TenantId { get; set; }
        public int? STT { get; set; }
        public long? ApplicationTypeId { get; set; } //Loai don nghi phep
        public string LeaveApplicationTypeTitle { get; set; }
        public string Description { get; set; } // Ghi chu them

        public long? DepartmentId { get; set; }
        public string DepartmentName { get; set; }

        public string RegistrationReason { get; set; } // Ly do xin nghi phep
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public decimal? NumberOfDayOff { get; set; } // So ngay nghi
        public bool? IsHalfDayLeave { get; set; }
        public bool IsDeleted { get; set; }
        public bool IsActive { get; set; }
        public DateTime? LastModificationTime { get; set; }
        public DateTime? CreationTime { get; set; }
        public int Status { get; set; } //Trang thai don nghi phep. Khoi tao = Da dang ky

    }
}
