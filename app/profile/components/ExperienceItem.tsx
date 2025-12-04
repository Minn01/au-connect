export default function ExperienceItem({
  role,
  company,
  period,
}: {
  role: string;
  company: string;
  period: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900">{role}</h3>
      <p className="text-gray-600 text-sm">{company}</p>
      <p className="text-gray-500 text-sm">{period}</p>
    </div>
  );
}
