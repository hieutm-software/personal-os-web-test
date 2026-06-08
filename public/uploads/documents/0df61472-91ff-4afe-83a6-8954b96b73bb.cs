using Abp.Application.Services.Dto;
using Abp.AutoMapper;
using ERP.Models.Business;
using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    [AutoMapTo(typeof(Models.Business.LeaveApplication))]
    public class LeaveNotApprovelDto : EntityDto<long>
    {
        public int? TenantId { get; set; }

        public int? STT { get; set; }

        public long? ApplicationTypeId { get; set; } //Loai don nghi phep
        public string LeaveApplicationTypeTitle { get; set; }
        public string LeaveApplicationTypeCode { get; set; }

        public long? LeaveApplicationReasonId { get; set; } //Loai ly do nghỉ
        public string LeaveApplicationReasonTitle { get; set; }

        public long? SubscriberId { get; set; } //Nguoi dang ky nghi phep
        public string SubcriberName { get; set; }
        public string SubcriberEmail { get; set; }

        public long? ApproverId { get; set; } //Nguoi xem xet, phe duyet,... . Dung cho viec cap nhat trang thai
        public string ApproverName { get; set; }
        public string ApproverEmail { get; set; }

        public DateTime? ApprovedDate { get; set; }

        public long? CensorId { get; set; } // Nguoi duoc gan kiem duyet

        public string CensorName { get; set; }

        public string CensorEmail { get; set; }

        public long? AuthorizedPersonId { get; set; } // Nguoi duoc uy quyen

        public string AuthorizedPersonName { get; set; }

        public string RelatedPeopleList { get; set; } // Store Id of related people to registered leave-application
        public string RelatedGroupList { get; set; } // Store Id of related people to registered leave-application

        public string Description { get; set; } // Ghi chu them

        public long? DepartmentId { get; set; }

        public string DepartmentName { get; set; }

        public string RegistrationReason { get; set; } // Ly do xin nghi phep

        public string ReasonEdit { get; set; } // Ly do xin sửa đơn
        public string ReasonDelete { get; set; } // Ly do xin xóa

        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        public decimal? NumberOfDayOff { get; set; } // So ngay nghi
        //public decimal? DaysLeft { get; set; }
        // TEST
        public decimal? AnnualLeaveWhenCreate { get; set; }

        public string Note { get; set; } // Xac nhan kiem duyet

        public int Status { get; set; } //Trang thai don nghi phep. Khoi tao = Da dang ky

        public bool? IsHalfDayLeave { get; set; }
        public bool? IsWeekendLeave { get; set; }

        public bool IsDeleted { get; set; }

        public bool IsActive { get; set; }

        public DateTime? LastModificationTime { get; set; }
        public DateTime? CreationTime { get; set; }

        public virtual ICollection<LeaveApplicationLogDto> LeaveAppLogs { get; set; }
        public List<string> ListRole { get; set; }

        public string ApproveButton { get; set; }

        public bool SendMail { get; set; }

        public string ApprovelNote { get; set; }
    }
}
