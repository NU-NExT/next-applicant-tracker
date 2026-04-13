locals {
  route53_zone_name = trimsuffix(var.route53_zone_name, ".")
}

resource "aws_route53_zone" "main" {
  count = var.enable_route53 && var.route53_create_zone ? 1 : 0

  name = local.route53_zone_name
  tags = merge(local.common_tags, { Name = "${local.name_prefix}-dns-zone" })
}

data "aws_route53_zone" "main" {
  count = var.enable_route53 && !var.route53_create_zone ? 1 : 0

  name         = local.route53_zone_name
  private_zone = false
}

locals {
  route53_zone_id = var.enable_route53 ? (
    var.route53_create_zone ? aws_route53_zone.main[0].zone_id : data.aws_route53_zone.main[0].zone_id
  ) : null

  route53_frontend_record_name = var.route53_frontend_subdomain == "" ? local.route53_zone_name : "${var.route53_frontend_subdomain}.${local.route53_zone_name}"
  route53_api_record_name      = "${var.route53_api_subdomain}.${local.route53_zone_name}"
}

resource "aws_route53_record" "frontend_alb_alias" {
  count = var.enable_route53 ? 1 : 0

  zone_id = local.route53_zone_id
  name    = local.route53_frontend_record_name
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_gateway_alias" {
  count = var.enable_route53 ? 1 : 0

  zone_id = local.route53_zone_id
  name    = local.route53_api_record_name
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api_custom_domain.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api_custom_domain.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
