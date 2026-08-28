package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.response.SecurityEndpointResponse;
import com.camping.duneinsolite.service.SecurityOverviewService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.condition.PathPatternsRequestCondition;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Reflects over the live {@link RequestMappingHandlerMapping} instead of a
 * hand-written table, precisely because a hand-written table drifts the
 * moment someone adds or edits an endpoint and forgets to update it - which
 * is exactly how three controllers ended up under just
 * {@code anyRequest().authenticated()} with no one noticing (see
 * CLAUDE.md). This can't drift: it is the routing table Spring is actually
 * using.
 */
@Service
public class SecurityOverviewServiceImpl implements SecurityOverviewService {

    private final RequestMappingHandlerMapping handlerMapping;

    // Two RequestMappingHandlerMapping beans exist (the app's own, plus
    // Actuator's controllerEndpointHandlerMapping for @ControllerEndpoint
    // beans, unused here) - @Qualifier picks Spring MVC's real routing
    // table, the one that actually serves /api/**.
    public SecurityOverviewServiceImpl(
            @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping) {
        this.handlerMapping = handlerMapping;
    }

    @Override
    public List<SecurityEndpointResponse> listEndpoints() {
        List<SecurityEndpointResponse> result = new ArrayList<>();

        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry
                : handlerMapping.getHandlerMethods().entrySet()) {

            RequestMappingInfo info = entry.getKey();
            HandlerMethod handlerMethod = entry.getValue();

            String path = firstPath(info);
            if (path == null) {
                continue; // no real HTTP path registered (rare, skip rather than guess)
            }

            String httpMethod = firstHttpMethod(info);
            String controller = handlerMethod.getBeanType().getSimpleName();
            String rule = preAuthorizeExpression(handlerMethod.getMethod());

            result.add(new SecurityEndpointResponse(controller, httpMethod, path, rule));
        }

        result.sort((a, b) -> {
            int byController = a.controller().compareTo(b.controller());
            return byController != 0 ? byController : a.path().compareTo(b.path());
        });

        return result;
    }

    private String firstPath(RequestMappingInfo info) {
        PathPatternsRequestCondition patterns = info.getPathPatternsCondition();
        if (patterns == null || patterns.getPatterns().isEmpty()) {
            return null;
        }
        return patterns.getPatterns().iterator().next().getPatternString();
    }

    private String firstHttpMethod(RequestMappingInfo info) {
        var methods = info.getMethodsCondition().getMethods();
        if (methods.isEmpty()) {
            return "ANY";
        }
        RequestMethod method = methods.iterator().next();
        return method.name();
    }

    // Method-level @PreAuthorize wins over class-level, matching Spring
    // Security's own precedence - AnnotatedElementUtils on the Method
    // already merges meta-annotations but does not fall back to the
    // declaring class, so that fallback is explicit here.
    private String preAuthorizeExpression(Method method) {
        PreAuthorize onMethod = AnnotatedElementUtils.findMergedAnnotation(method, PreAuthorize.class);
        if (onMethod != null) {
            return onMethod.value();
        }
        PreAuthorize onClass = AnnotatedElementUtils.findMergedAnnotation(
                method.getDeclaringClass(), PreAuthorize.class);
        return onClass != null ? onClass.value() : null;
    }
}
