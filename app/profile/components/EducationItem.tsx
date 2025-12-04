export default function EducationItem({
  school,
  degree,
  period,
}: {
  school: string;
  degree: string;
  period: string;
}) {
  return (
    <div className="mb-3">
      <h3 className="font-semibold text-gray-900">{school}</h3>
      <p className="text-gray-600 text-sm">{degree}</p>
      <p className="text-gray-500 text-sm">{period}</p>
    </div>
  );
}
